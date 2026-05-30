const Joi = require("joi");
const mongoose = require("mongoose");
const { Booking } = require("../models/Booking");
const { HttpError } = require("../utils/httpError");
const { logAudit } = require("../services/auditService");
const { normalizeMobileNumber } = require("../utils/mobile");

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
  amount: Joi.number().default(0)
});

const bookingUpdateSchema = bookingCreateSchema.keys({
  status: Joi.string().valid("pending", "confirmed", "cancelled").default("pending")
});

async function listBookings(req, res) {
  const isAdmin = ["super_admin", "vendor_admin"].includes(req.user?.role);
  let query = {};
  if (!isAdmin) {
    query = {
      $or: [{ user: req.user._id }, { phone: req.user.mobileNumber }]
    };
  }
  const data = await Booking.find(query).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data });
}

async function createBooking(req, res) {
  const { error, value } = bookingCreateSchema.validate(req.body);
  if (error) throw new HttpError(400, error.message);
  if (!mongoose.isValidObjectId(value.itemId)) throw new HttpError(400, "Invalid itemId");

  const isAdmin = ["super_admin", "vendor_admin"].includes(req.user?.role);
  const phone =
    normalizeMobileNumber(value.mobileNumber ?? value.phone) || req.user?.mobileNumber;
  if (!phone) throw new HttpError(400, "Valid mobile number is required.");

  let status = "pending";
  if (isAdmin && req.body?.status && ["pending", "confirmed", "cancelled"].includes(req.body.status)) {
    status = req.body.status;
  }

  const customerName = value.customerName?.trim() || `Guest ${phone.slice(-4)}`;

  const data = await Booking.create({
    ...value,
    phone,
    customerName,
    status,
    user: req.user._id
  });
  await logAudit({
    req,
    action: "create",
    entity: "booking",
    entityId: data._id,
    meta: { type: data.type, status: data.status },
    after: data.toObject()
  });
  res.status(201).json({ success: true, data });
}

async function updateBookingStatus(req, res) {
  const { status } = req.body;
  if (!["pending", "confirmed", "cancelled"].includes(status)) {
    throw new HttpError(400, "Invalid status");
  }

  const data = await Booking.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!data) throw new HttpError(404, "Booking not found");
  await logAudit({
    req,
    action: "update_status",
    entity: "booking",
    entityId: data._id,
    meta: { status: data.status },
    after: data.toObject()
  });
  res.json({ success: true, data });
}

async function updateBooking(req, res) {
  const { error, value } = bookingUpdateSchema.validate(req.body);
  if (error) throw new HttpError(400, error.message);
  if (!mongoose.isValidObjectId(value.itemId)) throw new HttpError(400, "Invalid itemId");
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, "Invalid booking id");

  const { itemId, ...rest } = value;
  const data = await Booking.findByIdAndUpdate(
    req.params.id,
    { $set: { ...rest, itemId } },
    { new: true, runValidators: true }
  );
  if (!data) throw new HttpError(404, "Booking not found");
  await logAudit({
    req,
    action: "update",
    entity: "booking",
    entityId: data._id,
    meta: { type: data.type, status: data.status },
    after: data.toObject()
  });
  res.json({ success: true, data });
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

module.exports = { listBookings, createBooking, updateBookingStatus, updateBooking, deleteBooking };
