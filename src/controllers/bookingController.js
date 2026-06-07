const Joi = require("joi");
const mongoose = require("mongoose");
const { Booking } = require("../models/Booking");
const { User } = require("../models/User");
const { Cab } = require("../models/Cab");
const { Driver } = require("../models/Driver");
const { Package } = require("../models/Package");
const { HttpError } = require("../utils/httpError");
const { logAudit } = require("../services/auditService");
const { normalizeMobileNumber } = require("../utils/mobile");
const {
  hasContactDetails,
  mergeVendorContact,
  resolveVendorContactForBooking,
  enrichBookingForDisplay
} = require("../utils/bookingContact");
const { buildCustomerBookingQuery, bookingOwnedByUser: bookingOwnedByUserQuery } = require("../utils/bookingQuery");
const { notifyCustomerBookingConfirmed } = require("../services/bookingNotifyService");
const { isAdminUser } = require("../utils/adminAccess");

const vendorContactSchema = Joi.object({
  name: Joi.string().allow("").default(""),
  phone: Joi.string().allow("").default(""),
  whatsapp: Joi.string().allow("").default(""),
  email: Joi.string().allow("").default(""),
  notes: Joi.string().allow("").default("")
});

const bookingCreateSchema = Joi.object({
  customerName: Joi.string().allow("").default(""),
  phone: Joi.string().optional(),
  mobileNumber: Joi.string().optional(),
  email: Joi.string().allow("").default(""),
  type: Joi.string().valid("cab", "driver", "tour").required(),
  itemId: Joi.string().required(),
  pickup: Joi.string().allow("").default(""),
  drop: Joi.string().allow("").default(""),
  date: Joi.string().allow("").default(""),
  routeType: Joi.string().allow("").default(""),
  tripType: Joi.string().allow("").default(""),
  pickupTime: Joi.string().allow("").default(""),
  serviceTripType: Joi.string().allow("").default(""),
  roundTrip: Joi.boolean().optional(),
  packageHours: Joi.number().allow(null).optional(),
  amount: Joi.number().default(0),
  paymentMethod: Joi.string()
    .valid(
      "cash",
      "pay_at_drop",
      "paytm",
      "gpay",
      "phonepe",
      "upi_any",
      "amazonpay",
      "cabzii_wallet",
      "card"
    )
    .default("cash"),
  coupon: Joi.string().allow("").optional(),
  pickupLat: Joi.number().allow(null).optional(),
  pickupLng: Joi.number().allow(null).optional(),
  dropLat: Joi.number().allow(null).optional(),
  dropLng: Joi.number().allow(null).optional(),
  distanceKm: Joi.number().allow(null).optional(),
  durationMin: Joi.number().allow(null).optional(),
  vendorContact: vendorContactSchema.optional()
});

const bookingUpdateSchema = bookingCreateSchema.keys({
  status: Joi.string().valid("pending", "confirmed", "finished", "cancelled").default("pending")
});

function bookingOwnedByUser(booking, user) {
  return bookingOwnedByUserQuery(booking, user);
}

async function enrichBookingsWithItemMeta(rows) {
  if (!rows.length) return rows;

  const cabIds = [];
  const driverIds = [];
  const tourIds = [];

  for (const row of rows) {
    const id = String(row.itemId || "");
    if (!id) continue;
    if (row.type === "cab") cabIds.push(id);
    else if (row.type === "driver") driverIds.push(id);
    else if (row.type === "tour") tourIds.push(id);
  }

  const [cabs, drivers, tours] = await Promise.all([
    cabIds.length ? Cab.find({ _id: { $in: cabIds } }).select("title vendor").lean() : [],
    driverIds.length ? Driver.find({ _id: { $in: driverIds } }).select("name vendor").lean() : [],
    tourIds.length ? Package.find({ _id: { $in: tourIds } }).select("name vendor").lean() : []
  ]);

  const cabMap = Object.fromEntries(cabs.map((c) => [String(c._id), c]));
  const driverMap = Object.fromEntries(drivers.map((d) => [String(d._id), d]));
  const tourMap = Object.fromEntries(tours.map((p) => [String(p._id), p]));

  return rows.map((row) => {
    const id = String(row.itemId || "");
    let item = null;
    if (row.type === "cab") item = cabMap[id];
    else if (row.type === "driver") item = driverMap[id];
    else if (row.type === "tour") item = tourMap[id];

    return {
      ...row,
      itemTitle: item?.title || item?.name || "",
      itemVendor: item?.vendor || ""
    };
  });
}

async function applyConfirmedContact(bookingDoc, incomingContact) {
  let vendorContact = mergeVendorContact(bookingDoc.vendorContact, incomingContact);
  if (!hasContactDetails(vendorContact)) {
    vendorContact = await resolveVendorContactForBooking(bookingDoc);
  }
  if (!hasContactDetails(vendorContact)) {
    throw new HttpError(400, "Add vendor contact phone before confirming the booking.");
  }
  return {
    vendorContact,
    contactSharedAt: new Date()
  };
}

async function getBookingById(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, "Invalid booking id");

  const data = await Booking.findById(req.params.id).lean();
  if (!data) throw new HttpError(404, "Booking not found");

  const isAdmin = isAdminUser(req);
  if (!isAdmin && !bookingOwnedByUser(data, req.user)) {
    throw new HttpError(403, "Forbidden");
  }

  const [enriched] = await enrichBookingsWithItemMeta([data]);

  res.json({
    success: true,
    data: await enrichBookingForDisplay(enriched, { isAdmin })
  });
}

async function listBookings(req, res) {
  const isAdmin = isAdminUser(req);
  const query = isAdmin ? {} : buildCustomerBookingQuery(req.user);
  let rows = await Booking.find(query).sort({ createdAt: -1 }).lean();
  rows = await enrichBookingsWithItemMeta(rows);
  const data = await Promise.all(rows.map((row) => enrichBookingForDisplay(row, { isAdmin })));
  res.json({ success: true, data });
}

async function createBooking(req, res) {
  const { error, value } = bookingCreateSchema.validate(req.body);
  if (error) throw new HttpError(400, error.message);
  if (!mongoose.isValidObjectId(value.itemId)) throw new HttpError(400, "Invalid itemId");

  const itemModels = { cab: Cab, driver: Driver, tour: Package };
  const ItemModel = itemModels[value.type];
  const itemExists = await ItemModel.findById(value.itemId).select("_id").lean();
  if (!itemExists) throw new HttpError(400, `${value.type} item not found`);

  const isAdmin = isAdminUser(req);
  const phone =
    normalizeMobileNumber(value.mobileNumber ?? value.phone) || req.user?.mobileNumber;
  if (!phone) throw new HttpError(400, "Valid mobile number is required.");

  let status = "pending";
  if (isAdmin && req.body?.status && ["pending", "confirmed", "finished", "cancelled"].includes(req.body.status)) {
    status = req.body.status;
  }

  const customerName = value.customerName?.trim() || `Guest ${phone.slice(-4)}`;
  const payload = {
    ...value,
    phone,
    customerName,
    status,
    user: req.user._id
  };

  if (status === "confirmed") {
    const contactPatch = await applyConfirmedContact(payload, value.vendorContact);
    Object.assign(payload, contactPatch);
  }

  const data = await Booking.create(payload);

  if (req.user?._id && (customerName || value.email)) {
    const userPatch = {};
    if (customerName && customerName !== `Guest ${phone.slice(-4)}`) {
      userPatch.name = customerName;
    }
    if (value.email?.trim()) userPatch.email = value.email.trim();
    if (Object.keys(userPatch).length) {
      await User.findByIdAndUpdate(req.user._id, { $set: userPatch }).catch(() => {});
    }
  }

  if (status === "confirmed") {
    notifyCustomerBookingConfirmed(data.toObject(), data.vendorContact).catch(() => {});
  }

  await logAudit({
    req,
    action: "create",
    entity: "booking",
    entityId: data._id,
    meta: { type: data.type, status: data.status },
    after: data.toObject()
  });
  res.status(201).json({
    success: true,
    data: await enrichBookingForDisplay(data.toObject(), { isAdmin })
  });
}

async function updateBookingStatus(req, res) {
  const { status, vendorContact } = req.body;
  if (!["pending", "confirmed", "finished", "cancelled"].includes(status)) {
    throw new HttpError(400, "Invalid status");
  }

  const existing = await Booking.findById(req.params.id);
  if (!existing) throw new HttpError(404, "Booking not found");

  const patch = { status };
  if (status === "confirmed") {
    const contactPatch = await applyConfirmedContact(existing.toObject(), vendorContact);
    Object.assign(patch, contactPatch);
    patch.finishedAt = null;
  } else if (status === "finished") {
    patch.finishedAt = new Date();
  } else if (status === "pending" || status === "cancelled") {
    patch.finishedAt = null;
  }

  const data = await Booking.findByIdAndUpdate(req.params.id, patch, { new: true });
  if (!data) throw new HttpError(404, "Booking not found");

  if (status === "confirmed" && existing.status !== "confirmed") {
    notifyCustomerBookingConfirmed(data.toObject(), data.vendorContact).catch(() => {});
  }

  await logAudit({
    req,
    action: "update_status",
    entity: "booking",
    entityId: data._id,
    meta: { status: data.status },
    after: data.toObject()
  });
  res.json({
    success: true,
    data: await enrichBookingForDisplay(data.toObject(), { isAdmin: true })
  });
}

async function updateBooking(req, res) {
  const { error, value } = bookingUpdateSchema.validate(req.body);
  if (error) throw new HttpError(400, error.message);
  if (!mongoose.isValidObjectId(value.itemId)) throw new HttpError(400, "Invalid itemId");
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, "Invalid booking id");

  const existing = await Booking.findById(req.params.id).lean();
  if (!existing) throw new HttpError(404, "Booking not found");

  const { itemId, vendorContact, status, ...rest } = value;
  const patch = { ...rest, itemId, status };

  if (status === "confirmed") {
    const contactPatch = await applyConfirmedContact({ ...existing, ...patch }, vendorContact);
    Object.assign(patch, contactPatch);
    patch.finishedAt = null;
  } else if (status === "finished") {
    patch.finishedAt = existing.finishedAt || new Date();
  } else if (vendorContact) {
    patch.vendorContact = mergeVendorContact(existing.vendorContact, vendorContact);
  }

  const data = await Booking.findByIdAndUpdate(
    req.params.id,
    { $set: patch },
    { new: true, runValidators: true }
  );
  if (!data) throw new HttpError(404, "Booking not found");

  if (status === "confirmed" && existing.status !== "confirmed") {
    notifyCustomerBookingConfirmed(data.toObject(), data.vendorContact).catch(() => {});
  }

  await logAudit({
    req,
    action: "update",
    entity: "booking",
    entityId: data._id,
    meta: { type: data.type, status: data.status },
    after: data.toObject()
  });
  res.json({
    success: true,
    data: await enrichBookingForDisplay(data.toObject(), { isAdmin: true })
  });
}

async function finishBooking(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, "Invalid booking id");

  const existing = await Booking.findById(req.params.id).lean();
  if (!existing) throw new HttpError(404, "Booking not found");

  if (!bookingOwnedByUser(existing, req.user)) {
    throw new HttpError(403, "You can only finish your own booking.");
  }
  if (existing.status !== "confirmed") {
    throw new HttpError(400, "Only confirmed bookings can be marked as finished.");
  }

  const data = await Booking.findByIdAndUpdate(
    req.params.id,
    { status: "finished", finishedAt: new Date() },
    { new: true }
  );

  await logAudit({
    req,
    action: "finish",
    entity: "booking",
    entityId: data._id,
    meta: { status: data.status },
    after: data.toObject()
  });

  res.json({
    success: true,
    data: await enrichBookingForDisplay(data.toObject(), { isAdmin: false })
  });
}

async function deleteBooking(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, "Invalid booking id");
  const data = await Booking.findByIdAndDelete(req.params.id);
  if (!data) throw new HttpError(404, "Booking not found");
  await logAudit({
    req,
    action: "delete",
    entity: "booking",
    entityId: data._id,
    before: data.toObject()
  });
  res.json({ success: true, message: "Booking deleted" });
}

module.exports = {
  getBookingById,
  listBookings,
  createBooking,
  updateBookingStatus,
  updateBooking,
  finishBooking,
  deleteBooking
};
