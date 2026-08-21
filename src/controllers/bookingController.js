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
const { isAdminUser, isSuperAdminUser, isDriverUser } = require("../utils/adminAccess");
const { applyCoupon } = require("../utils/coupons");
const { resolveVehicleFare, resolveBusFare, resolveTourFare, composeFare, cabPackageIdFromTrip } = require("../utils/bookingFare");
const { isVendorAdmin, buildVendorBookingQuery } = require("../utils/vendorBookingAccess");
const { stripUntrustedPricing, applyFareSnapshot } = require("../utils/bookingIntegrity");
const { BusTrip } = require("../models/BusTrip");
const {
  isAvailabilityType,
  isActiveReservation,
  validateCabDriverSchedule,
  assertItemAvailable,
  assertVendorOwnsBookableItem,
  createBookingWithAvailability,
  stampCabDriverSchedule,
  stampCreateAssignments,
  assertPendingHoldValid,
  isReservationBlocking
} = require("../utils/bookingAvailability");
const {
  loadOwnedVehicle,
  loadOwnedDriver,
  assertReassignmentAllowed,
  applyAssignmentAvailability
} = require("../utils/bookingAssignment");
const { vendorFinishPatch } = require("../utils/driverTripOps");
const {
  isTrackableBookingType,
  assertCanReadBookingLocation,
  customerLocationPayload
} = require("../utils/customerTracking");
const { SiteSettings } = require("../models/SiteSettings");
const { mergeSiteSettings } = require("../config/siteSettingsDefaults");
const { quoteCallDriver, persistableCallDriver } = require("../utils/callDriverFare");
const {
  isCallDriverPayload,
  callDriverServiceLabel,
  customerDriverLabel,
  resolveDriverOpsStatus,
  setDriverAvailability
} = require("../utils/callDriverBooking");

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
  type: Joi.string().valid("cab", "driver", "tour", "bus").required(),
  itemId: Joi.string().allow("").optional(),
  busMeta: Joi.object({
    tripId: Joi.string().allow("").default(""),
    operator: Joi.string().allow("").default(""),
    seats: Joi.array().items(Joi.string()).default([]),
    boardingPoint: Joi.string().allow("").default(""),
    droppingPoint: Joi.string().allow("").default(""),
    busType: Joi.string().allow("").default(""),
    fromCity: Joi.string().allow("").default(""),
    toCity: Joi.string().allow("").default(""),
    passengers: Joi.array()
      .items(
        Joi.object({
          name: Joi.string().allow("").default(""),
          age: Joi.number().allow(null),
          gender: Joi.string().valid("M", "F", "male", "female").allow("").default(""),
          seatId: Joi.string().allow("").default("")
        })
      )
      .default([]),
    tripGuarantee: Joi.boolean().default(false)
  }).optional(),
  pickup: Joi.string().allow("").default(""),
  drop: Joi.string().allow("").default(""),
  date: Joi.string().allow("").default(""),
  routeType: Joi.string().allow("").default(""),
  tripType: Joi.string().allow("").default(""),
  pickupTime: Joi.string().allow("").default(""),
  serviceTripType: Joi.string().allow("").default(""),
  roundTrip: Joi.boolean().optional(),
  packageHours: Joi.number().allow(null).optional(),
  packageId: Joi.string().allow("").optional(),
  cabType: Joi.string().allow("").optional(),
  persons: Joi.number().allow(null).optional(),
  amount: Joi.number().optional(),
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
  vendorContact: vendorContactSchema.optional(),
  callDriver: Joi.object({
    serviceType: Joi.string()
      .valid("local", "outstation", "airport", "school", "corporate", "valet")
      .required(),
    vehicleType: Joi.string().valid("standard", "premium", "").allow("").optional(),
    vehicleModel: Joi.string().allow("").optional(),
    hours: Joi.number().min(0).allow(null).optional(),
    days: Joi.number().min(0).allow(null).optional(),
    estimatedKm: Joi.number().min(0).allow(null).optional(),
    pickupTime: Joi.string().allow("").optional(),
    returnDate: Joi.string().allow("").optional(),
    airport: Joi.string().allow("").optional(),
    airportDirection: Joi.string().allow("").optional(),
    schoolName: Joi.string().allow("").optional(),
    schoolShift: Joi.string().allow("").optional(),
    workingDays: Joi.number().min(0).allow(null).optional(),
    parentContact: Joi.string().allow("").optional(),
    companyName: Joi.string().allow("").optional(),
    contactPerson: Joi.string().allow("").optional(),
    driversRequired: Joi.number().min(0).allow(null).optional(),
    supervisorCount: Joi.number().min(0).allow(null).optional(),
    workingHours: Joi.string().allow("").optional(),
    notes: Joi.string().allow("").optional(),
    eventLocation: Joi.string().allow("").optional(),
    quoteRequested: Joi.boolean().optional()
  }).optional()
});

const bookingUpdateSchema = bookingCreateSchema.keys({
  status: Joi.string().valid("pending", "confirmed", "finished", "cancelled").default("pending")
});

function denyDriverGenericBookingAccess() {
  throw new HttpError(403, "Drivers must use /driver/trips for assigned trips.");
}

function bookingOwnedByUser(booking, user) {
  return bookingOwnedByUserQuery(booking, user);
}

function catalogActive(item) {
  if (!item) return false;
  if (item.isDeleted) return false;
  if (item.status && item.status !== "active") return false;
  return true;
}

async function countPriorCompletedBookings(user) {
  if (!user) return 0;
  const query = buildCustomerBookingQuery(user);
  if (!query || !Object.keys(query).length) return 0;
  return Booking.countDocuments({
    ...query,
    status: { $in: ["confirmed", "finished"] }
  });
}

async function computeServerFare(value, user) {
  const trip = {
    tripType: value.serviceTripType || value.tripType || "",
    serviceTripType: value.serviceTripType || "",
    roundTrip: Boolean(value.roundTrip),
    packageHours: value.packageHours,
    packageId: value.packageId || "",
    pickup: value.pickup,
    drop: value.drop,
    pickupLat: value.pickupLat,
    pickupLng: value.pickupLng,
    dropLat: value.dropLat,
    dropLng: value.dropLng
  };
  if (!trip.packageId) trip.packageId = cabPackageIdFromTrip(trip);

  const prior = await countPriorCompletedBookings(user);

  if (isCallDriverPayload(value)) {
    const settingsDoc = await SiteSettings.findOne({ key: "main" }).lean();
    const settings = mergeSiteSettings(settingsDoc || {});
    const quoteInput = {
      ...value.callDriver,
      pickupTime: value.callDriver.pickupTime || value.pickupTime,
      estimatedKm: value.callDriver.estimatedKm || value.distanceKm
    };
    const resolved = quoteCallDriver(settings.callDriverTariff, quoteInput);
    value.callDriver = persistableCallDriver(quoteInput, resolved);
    const couponResult = applyCoupon({
      code: value.coupon,
      serviceType: "driver",
      tripType: value.callDriver.serviceType,
      date: value.date,
      baseFare: resolved.total,
      priorCompletedBookings: prior
    });
    return {
      item: null,
      snapshot: composeFare({
        baseFare: resolved.total,
        fees: 0,
        couponResult,
        pricingSource: resolved.pricingSource,
        distanceKm: resolved.estimatedKm || value.distanceKm || null,
        vendor: "Cabzii",
        vendorAdminPhone: settings.contact?.whatsapp || settings.contact?.phone || ""
      })
    };
  }

  if (value.type === "cab" || value.type === "driver") {
    const Model = value.type === "cab" ? Cab : Driver;
    const item = await Model.findById(value.itemId).lean();
    if (!catalogActive(item)) throw new HttpError(400, `${value.type} item not found`);
    const resolved = resolveVehicleFare(item, trip, value.type);
    const couponResult = applyCoupon({
      code: value.coupon,
      serviceType: value.type,
      tripType: trip.tripType,
      date: value.date,
      baseFare: resolved.baseFare,
      priorCompletedBookings: prior
    });
    return {
      item,
      snapshot: composeFare({
        baseFare: resolved.baseFare,
        fees: 0,
        couponResult,
        pricingSource: resolved.pricingSource,
        distanceKm: resolved.distanceKm || null,
        vendor: item.vendor || "",
        vendorAdminPhone: item.vendorAdminPhone || ""
      })
    };
  }

  if (value.type === "tour") {
    const item = await Package.findById(value.itemId).lean();
    if (!catalogActive(item)) throw new HttpError(400, "tour item not found");
    const resolved = resolveTourFare(item, { cabType: value.cabType });
    const couponResult = applyCoupon({
      code: value.coupon,
      serviceType: "tour",
      tripType: "tour",
      date: value.date,
      baseFare: resolved.baseFare,
      priorCompletedBookings: prior
    });
    return {
      item,
      snapshot: composeFare({
        baseFare: resolved.baseFare,
        fees: 0,
        couponResult,
        pricingSource: resolved.pricingSource,
        vendor: item.vendor || "",
        vendorAdminPhone: item.vendorAdminPhone || ""
      })
    };
  }

  if (value.type === "bus") {
    const tripId = value.busMeta?.tripId || value.itemId;
    if (!tripId || !mongoose.isValidObjectId(tripId)) throw new HttpError(400, "Invalid bus trip");
    const item = await BusTrip.findById(tripId).lean();
    if (!item || item.status === "inactive") throw new HttpError(400, "bus trip not found");
    const seats = value.busMeta?.seats || [];
    const resolved = resolveBusFare(item, seats, Boolean(value.busMeta?.tripGuarantee));
    const couponResult = applyCoupon({
      code: value.coupon,
      serviceType: "bus",
      tripType: "bus",
      date: value.date,
      baseFare: resolved.baseFare,
      priorCompletedBookings: prior
    });
    return {
      item,
      snapshot: composeFare({
        baseFare: resolved.baseFare,
        fees: resolved.fees,
        couponResult,
        pricingSource: resolved.pricingSource,
        vendor: item.vendor || item.operator || "",
        vendorAdminPhone: item.vendorAdminPhone || ""
      })
    };
  }

  throw new HttpError(400, "Invalid booking type");
}

async function bookingQueryForRequest(req) {
  if (isSuperAdminUser(req)) return {};
  if (isVendorAdmin(req)) return buildVendorBookingQuery(req);
  return buildCustomerBookingQuery(req.user);
}

async function enrichBookingsWithItemMeta(rows) {
  if (!rows.length) return rows;

  const cabIds = [];
  const driverIds = [];
  const tourIds = [];

  for (const row of rows) {
    if (row.type === "cab" && row.itemId) cabIds.push(row.itemId);
    if (row.assignedVehicleId) cabIds.push(row.assignedVehicleId);
    if (row.type === "driver" && row.itemId) driverIds.push(row.itemId);
    if (row.assignedDriverId) driverIds.push(row.assignedDriverId);
    if (row.type === "tour" && row.itemId) tourIds.push(row.itemId);
  }

  const [cabs, drivers, tours] = await Promise.all([
    cabIds.length ? Cab.find({ _id: { $in: cabIds } }).select("title vendor vehicleName vehicleModel").lean() : [],
    driverIds.length ? Driver.find({ _id: { $in: driverIds } }).select("name vendor phone").lean() : [],
    tourIds.length ? Package.find({ _id: { $in: tourIds } }).select("name vendor").lean() : []
  ]);

  const cabMap = Object.fromEntries(cabs.map((c) => [String(c._id), c]));
  const driverMap = Object.fromEntries(drivers.map((d) => [String(d._id), d]));
  const tourMap = Object.fromEntries(tours.map((p) => [String(p._id), p]));

  return rows.map((row) => {
    const id = String(row.itemId || "");
    let item = null;
    if (row.type === "cab") item = cabMap[id];
    else if (row.type === "driver" && !row.callDriver?.serviceType) item = driverMap[id];
    else if (row.type === "tour") item = tourMap[id];

    const assignedCab = row.assignedVehicleId ? cabMap[String(row.assignedVehicleId)] : null;
    const assignedDriver = row.assignedDriverId ? driverMap[String(row.assignedDriverId)] : null;
    const bookedDriver = row.type === "driver" && !row.callDriver?.serviceType ? item : null;
    const serviceTitle = row.callDriver?.serviceType
      ? callDriverServiceLabel(row.callDriver.serviceType)
      : "";

    return {
      ...row,
      itemTitle: serviceTitle || item?.title || item?.name || "",
      itemVendor: item?.vendor || (row.callDriver?.serviceType ? "Cabzii" : ""),
      assignedVehicleTitle:
        assignedCab?.title || assignedCab?.vehicleName || assignedCab?.vehicleModel || "",
      assignedDriverName: customerDriverLabel(row, assignedDriver) || bookedDriver?.name || "",
      assignedDriverPhone: assignedDriver?.phone || "",
      driverAssigned: Boolean(assignedDriver),
      driverOpsStatus: resolveDriverOpsStatus(row),
      holdActive: row.status === "pending" ? isReservationBlocking(row) : false
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

async function loadBookingForRead(req, id) {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(400, "Invalid booking id");

  if (isSuperAdminUser(req)) {
    const data = await Booking.findById(id).lean();
    if (!data) throw new HttpError(404, "Booking not found");
    return { data, isAdmin: true };
  }

  if (isVendorAdmin(req)) {
    const scope = await buildVendorBookingQuery(req);
    const owned = await Booking.findOne({ _id: id, ...scope }).lean();
    if (owned) return { data: owned, isAdmin: true };

    const data = await Booking.findById(id).lean();
    if (!data || !bookingOwnedByUser(data, req.user)) {
      throw new HttpError(404, "Booking not found");
    }
    return { data, isAdmin: false };
  }

  const data = await Booking.findById(id).lean();
  if (!data) throw new HttpError(404, "Booking not found");
  if (!bookingOwnedByUser(data, req.user)) {
    throw new HttpError(403, "Forbidden");
  }
  return { data, isAdmin: false };
}

async function loadBookingForMutation(req, id) {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(400, "Invalid booking id");

  if (isSuperAdminUser(req)) {
    const data = await Booking.findById(id);
    if (!data) throw new HttpError(404, "Booking not found");
    return data;
  }

  if (isVendorAdmin(req)) {
    const scope = await buildVendorBookingQuery(req);
    const data = await Booking.findOne({ _id: id, ...scope });
    if (!data) throw new HttpError(404, "Booking not found");
    return data;
  }

  throw new HttpError(403, "Forbidden");
}

async function getBookingById(req, res) {
  if (isDriverUser(req)) denyDriverGenericBookingAccess();
  const { data, isAdmin } = await loadBookingForRead(req, req.params.id);
  const [enriched] = await enrichBookingsWithItemMeta([data]);
  res.json({
    success: true,
    data: await enrichBookingForDisplay(enriched, { isAdmin })
  });
}

async function listBookings(req, res) {
  if (isDriverUser(req)) denyDriverGenericBookingAccess();
  const query = await bookingQueryForRequest(req);
  const isAdmin = isSuperAdminUser(req) || isVendorAdmin(req);
  let rows = await Booking.find(query).sort({ createdAt: -1 }).lean();
  rows = await enrichBookingsWithItemMeta(rows);
  const data = await Promise.all(rows.map((row) => enrichBookingForDisplay(row, { isAdmin })));
  res.json({ success: true, data });
}

async function createBooking(req, res) {
  if (isDriverUser(req)) denyDriverGenericBookingAccess();
  const { error, value } = bookingCreateSchema.validate(req.body, { stripUnknown: true });
  if (error) throw new HttpError(400, error.message);

  if (value.type === "bus") {
    const seats = value.busMeta?.seats?.length
      ? value.busMeta.seats
      : String(value.routeType || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
    if (!seats.length) throw new HttpError(400, "At least one bus seat is required.");
    value.busMeta = {
      tripId: value.busMeta?.tripId || value.itemId || "",
      operator: value.busMeta?.operator || value.serviceTripType || "",
      seats,
      boardingPoint: value.busMeta?.boardingPoint || value.pickup || "",
      droppingPoint: value.busMeta?.droppingPoint || value.drop || "",
      busType: value.busMeta?.busType || value.tripType || "",
      fromCity: value.busMeta?.fromCity || "",
      toCity: value.busMeta?.toCity || "",
      passengers: value.busMeta?.passengers || [],
      tripGuarantee: Boolean(value.busMeta?.tripGuarantee)
    };
  } else if (isCallDriverPayload(value)) {
    value.itemId = value.itemId && mongoose.isValidObjectId(value.itemId) ? value.itemId : null;
    if (!value.pickupTime && value.callDriver.pickupTime) value.pickupTime = value.callDriver.pickupTime;
    if (!value.pickupTime) value.pickupTime = "09:00";
    if (!value.serviceTripType) value.serviceTripType = value.callDriver.serviceType;
  } else if (!mongoose.isValidObjectId(value.itemId)) {
    throw new HttpError(400, "Invalid itemId");
  }

  const { item, snapshot } = await computeServerFare(value, req.user);

  if (isAvailabilityType(value.type) && item) {
    validateCabDriverSchedule(value, { allowPast: isSuperAdminUser(req) });
    assertVendorOwnsBookableItem(req, value.type, item);
  } else if (isCallDriverPayload(value)) {
    validateCabDriverSchedule(value, { allowPast: isSuperAdminUser(req) });
  }

  if (value.type === "bus") {
    const { reserveBusSeats } = require("./busController");
    const tripId = item._id;
    const seats = value.busMeta.seats;
    const taken = new Set((item.bookedSeats || []).map(String));
    const clash = seats.filter((s) => taken.has(String(s)));
    if (clash.length) {
      throw new HttpError(409, `Seat${clash.length > 1 ? "s" : ""} ${clash.join(", ")} already sold. Pick another seat.`);
    }
    const gender = String(value.busMeta.passengers?.[0]?.gender || "M").toUpperCase().startsWith("F") ? "F" : "M";
    await reserveBusSeats(tripId, seats, gender);
    value.itemId = tripId;
  }

  const phone =
    normalizeMobileNumber(value.mobileNumber ?? value.phone) || req.user?.mobileNumber;
  if (!phone) throw new HttpError(400, "Valid mobile number is required.");

  let status = "pending";
  if (
    isSuperAdminUser(req) &&
    req.body?.status &&
    ["pending", "confirmed", "finished", "cancelled"].includes(req.body.status)
  ) {
    status = req.body.status;
  }

  const customerName = value.customerName?.trim() || `Guest ${phone.slice(-4)}`;
  const payload = applyFareSnapshot(
    {
      ...stripUntrustedPricing(value),
      itemId: value.itemId,
      phone,
      customerName,
      status,
      user: req.user._id,
      coupon: value.coupon || "",
      packageId: value.packageId || cabPackageIdFromTrip({
        tripType: value.serviceTripType || value.tripType,
        roundTrip: value.roundTrip,
        packageHours: value.packageHours,
        packageId: value.packageId
      })
    },
    snapshot
  );

  if (status === "confirmed") {
    const contactPatch = await applyConfirmedContact(payload, value.vendorContact);
    Object.assign(payload, contactPatch);
  }

  stampCabDriverSchedule(payload);
  stampCreateAssignments(payload);

  const data = await createBookingWithAvailability(payload);

  try {
    const { upsertCrmLeadFromBooking } = require("./crmController");
    await upsertCrmLeadFromBooking(data);
  } catch {
    /* CRM is best-effort */
  }

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
    meta: { type: data.type, status: data.status, amount: data.amount },
    after: data.toObject()
  });
  res.status(201).json({
    success: true,
    data: await enrichBookingForDisplay(data.toObject(), { isAdmin: isAdminUser(req) })
  });
}

async function updateBookingStatus(req, res) {
  const { status, vendorContact } = req.body;
  if (!["pending", "confirmed", "finished", "cancelled"].includes(status)) {
    throw new HttpError(400, "Invalid status");
  }

  const existing = await loadBookingForMutation(req, req.params.id);

  if (status === "confirmed") {
    assertPendingHoldValid(existing.toObject());
  }

  if (isAvailabilityType(existing.type) && isActiveReservation(status)) {
    await assertItemAvailable(existing.toObject(), { excludeId: existing._id });
  }

  const patch = { status };
  if (status === "confirmed") {
    const contactPatch = await applyConfirmedContact(existing.toObject(), vendorContact);
    Object.assign(patch, contactPatch);
    patch.finishedAt = null;
    patch.expiresAt = null;
  } else if (status === "finished") {
    Object.assign(patch, vendorFinishPatch(existing.toObject()));
  } else if (status === "cancelled") {
    patch.finishedAt = null;
    patch.expiresAt = null;
  } else if (status === "pending") {
    patch.finishedAt = null;
  }

  const data = await Booking.findByIdAndUpdate(existing._id, patch, { new: true });
  if (!data) throw new HttpError(404, "Booking not found");

  if (status === "cancelled" && existing.status !== "cancelled" && existing.type === "bus") {
    const { releaseBusSeats } = require("./busController");
    const tripId = existing.busMeta?.tripId || existing.itemId;
    await releaseBusSeats(tripId, existing.busMeta?.seats || []);
  }

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
  const { error, value } = bookingUpdateSchema.validate(req.body, { stripUnknown: true });
  if (error) throw new HttpError(400, error.message);
  if (value.itemId && !mongoose.isValidObjectId(value.itemId)) throw new HttpError(400, "Invalid itemId");

  const existing = await loadBookingForMutation(req, req.params.id);
  const safe = stripUntrustedPricing(value);
  const { itemId, vendorContact, status, ...rest } = safe;
  const patch = { ...rest, status };

  if (isSuperAdminUser(req) && itemId) {
    patch.itemId = itemId;
  }

  const merged = { ...existing.toObject(), ...patch };
  const scheduleChanged = ["date", "pickupTime", "packageHours", "packageId", "itemId"].some(
    (key) => patch[key] !== undefined && String(patch[key] ?? "") !== String(existing[key] ?? "")
  );
  if (isAvailabilityType(merged.type) && isActiveReservation(merged.status)) {
    if (scheduleChanged) {
      validateCabDriverSchedule(merged, { allowPast: isSuperAdminUser(req) });
      stampCabDriverSchedule(merged);
      if (merged.startAt) {
        patch.startAt = merged.startAt;
        patch.endAt = merged.endAt;
      }
      if (merged.status === "pending" && merged.expiresAt) patch.expiresAt = merged.expiresAt;
    }
    await assertItemAvailable({ ...merged, ...patch }, { excludeId: existing._id });
  }

  if (status === "confirmed") {
    const contactPatch = await applyConfirmedContact({ ...existing.toObject(), ...patch }, vendorContact);
    Object.assign(patch, contactPatch);
    patch.finishedAt = null;
    patch.expiresAt = null;
  } else if (status === "finished") {
    Object.assign(patch, vendorFinishPatch(existing.toObject()));
  } else if (status === "cancelled") {
    patch.expiresAt = null;
  } else if (vendorContact) {
    patch.vendorContact = mergeVendorContact(existing.vendorContact, vendorContact);
  }

  const data = await Booking.findByIdAndUpdate(
    existing._id,
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

async function assignBookingResources(req, res) {
  const existing = await loadBookingForMutation(req, req.params.id);
  assertReassignmentAllowed(existing.toObject(), { allowPast: isSuperAdminUser(req) });

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const patch = {};

  if (Object.prototype.hasOwnProperty.call(body, "assignedVehicleId")) {
    const vehicle = await loadOwnedVehicle(req, body.assignedVehicleId);
    patch.assignedVehicleId = vehicle ? vehicle._id : null;
  }
  if (Object.prototype.hasOwnProperty.call(body, "assignedDriverId")) {
    const driver = await loadOwnedDriver(req, body.assignedDriverId);
    patch.assignedDriverId = driver ? driver._id : null;
    if (existing.type === "driver" && existing.callDriver?.serviceType) {
      patch["callDriver.opsStatus"] = driver ? "driver_assigned" : existing.status === "cancelled" ? "cancelled" : "confirmed";
      if (driver) {
        patch.vendorContact = {
          name: driver.name || "Professional Cabzii Driver",
          phone: driver.phone || "",
          whatsapp: driver.phone || "",
          email: "",
          notes: existing.vendorContact?.notes || ""
        };
        if (existing.status === "pending") {
          patch.status = "confirmed";
          patch.expiresAt = null;
          patch.contactSharedAt = new Date();
        }
      }
    }
  }

  if (!Object.keys(patch).length) {
    throw new HttpError(400, "Provide assignedVehicleId or assignedDriverId.");
  }

  const merged = { ...existing.toObject(), ...patch };
  await applyAssignmentAvailability(merged, { excludeId: existing._id });

  const previousDriverId = existing.assignedDriverId;
  const data = await Booking.findByIdAndUpdate(existing._id, { $set: patch }, { new: true });
  if (!data) throw new HttpError(404, "Booking not found");

  if (Object.prototype.hasOwnProperty.call(patch, "assignedDriverId")) {
    if (previousDriverId && String(previousDriverId) !== String(data.assignedDriverId || "")) {
      await setDriverAvailability(previousDriverId, "available");
    }
    if (data.assignedDriverId) {
      await setDriverAvailability(data.assignedDriverId, "assigned");
    }
  }

  await logAudit({
    req,
    action: "assign",
    entity: "booking",
    entityId: data._id,
    meta: {
      assignedVehicleId: data.assignedVehicleId,
      assignedDriverId: data.assignedDriverId
    },
    after: data.toObject()
  });

  const [enriched] = await enrichBookingsWithItemMeta([data.toObject()]);
  res.json({
    success: true,
    data: await enrichBookingForDisplay(enriched, { isAdmin: true })
  });
}

async function finishBooking(req, res) {
  if (isDriverUser(req)) denyDriverGenericBookingAccess();
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, "Invalid booking id");

  const existing = await Booking.findById(req.params.id).lean();
  if (!existing) throw new HttpError(404, "Booking not found");

  if (!bookingOwnedByUser(existing, req.user)) {
    throw new HttpError(403, "You can only finish your own booking.");
  }
  if (existing.status !== "confirmed") {
    throw new HttpError(400, "Only confirmed bookings can be marked as finished.");
  }

  const finishPatch = vendorFinishPatch(existing);
  if (existing.callDriver?.serviceType) finishPatch["callDriver.opsStatus"] = "trip_completed";
  const data = await Booking.findByIdAndUpdate(req.params.id, finishPatch, { new: true });
  if (existing.assignedDriverId) await setDriverAvailability(existing.assignedDriverId, "available");

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
  const existing = await loadBookingForMutation(req, req.params.id);
  const data = await Booking.findByIdAndDelete(existing._id);
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

async function getCustomerBookingLocation(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, "Invalid booking id");

  const booking = await Booking.findById(req.params.id).lean();
  assertCanReadBookingLocation(booking, req);

  if (!isTrackableBookingType(booking.type)) {
    throw new HttpError(400, "Tracking is only available for cab trips.");
  }

  const [enriched] = await enrichBookingsWithItemMeta([booking]);
  const row = enriched[0] || booking;
  res.json({
    success: true,
    data: customerLocationPayload(row, {
      driverName: row.assignedDriverName || "",
      vehicleTitle: row.assignedVehicleTitle || row.itemTitle || ""
    })
  });
}

module.exports = {
  getBookingById,
  listBookings,
  createBooking,
  updateBookingStatus,
  updateBooking,
  assignBookingResources,
  finishBooking,
  deleteBooking,
  getCustomerBookingLocation
};
