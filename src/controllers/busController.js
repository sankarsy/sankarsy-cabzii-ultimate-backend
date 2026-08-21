const Joi = require("joi");
const mongoose = require("mongoose");
const { BusTrip } = require("../models/BusTrip");
const { HttpError } = require("../utils/httpError");
const { logAudit } = require("../services/auditService");
const { parseListQuery, paginatedFind } = require("../utils/listQuery");
const { listFilterForVendor, docMatchForVendor, applyAuthenticatedVendorOwnership } = require("../utils/vendorAccess");
const { isSuperAdminUser } = require("../utils/adminAccess");

const stopSchema = Joi.object({
  name: Joi.string().allow("").default(""),
  time: Joi.string().allow("").default(""),
  landmark: Joi.string().allow("").default("")
});

const busSchema = Joi.object({
  operator: Joi.string().required(),
  operatorCode: Joi.string().allow("").default(""),
  operatorLogo: Joi.string().allow("").default(""),
  vendor: Joi.string().allow("").default("Cabzii Partner"),
  fromCity: Joi.string().required(),
  toCity: Joi.string().required(),
  departureTime: Joi.string().allow("").default("06:00"),
  arrivalTime: Joi.string().allow("").default("14:00"),
  duration: Joi.string().allow("").default("8h"),
  durationMin: Joi.number().default(480),
  busType: Joi.string().allow("").default("AC Seater"),
  seaterPrice: Joi.number().default(599),
  sleeperPrice: Joi.number().default(899),
  lowerBerthPrice: Joi.number().default(999),
  upperBerthPrice: Joi.number().default(799),
  boardingPoints: Joi.array().items(stopSchema).default([]),
  droppingPoints: Joi.array().items(stopSchema).default([]),
  bookedSeats: Joi.array().items(Joi.string()).default([]),
  bookedSeatGenders: Joi.object().unknown(true).default({}),
  amenities: Joi.array().items(Joi.string()).default([]),
  rating: Joi.number().default(4.2),
  reviewCount: Joi.number().default(100),
  exclusiveDiscount: Joi.number().default(100),
  tripGuaranteePrice: Joi.number().default(24),
  distanceKm: Joi.number().default(0),
  onTimePercent: Joi.number().default(86),
  onTimeTrips: Joi.number().default(957),
  onTimeTotal: Joi.number().default(1113),
  layoutPreset: Joi.string().allow("").default(""),
  cancellationPolicy: Joi.array()
    .items(Joi.object({ hoursBefore: Joi.number().default(0), refundPercent: Joi.number().default(0) }))
    .default([]),
  restStops: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().allow("").default(""),
        time: Joi.string().allow("").default(""),
        durationMin: Joi.number().default(15),
        features: Joi.array().items(Joi.string()).default([])
      })
    )
    .default([]),
  routeStops: Joi.array().items(Joi.string()).default([]),
  policies: Joi.object({
    luggage: Joi.string().allow("").default(""),
    pets: Joi.string().allow("").default(""),
    liquor: Joi.string().allow("").default(""),
    pickupTime: Joi.string().allow("").default("")
  }).default({}),
  liveTracking: Joi.object({
    enabled: Joi.boolean().default(true),
    lat: Joi.number().allow(null),
    lng: Joi.number().allow(null),
    updatedAt: Joi.date().allow(null, ""),
    status: Joi.string().allow("").default("on_time")
  }).default({}),
  status: Joi.string().valid("active", "inactive").default("active"),
  slug: Joi.string().allow("").default(""),
  enterpriseSeo: Joi.object().unknown(true).default({}),
  seoTitle: Joi.string().allow("").default(""),
  seoDescription: Joi.string().allow("").default(""),
  seo: Joi.string().allow("").default("")
});

function normCity(s) {
  return String(s || "")
    .trim()
    .toLowerCase();
}

function toApiRow(doc) {
  const d = doc.toObject ? doc.toObject() : doc;
  return {
    ...d,
    id: String(d._id),
    operator: { name: d.operator, code: d.operatorCode || d.operator?.slice(0, 3), logo: d.operatorLogo },
    departure: { time: d.departureTime, city: d.fromCity },
    arrival: { time: d.arrivalTime, city: d.toCity },
    fares: {
      seater: d.seaterPrice,
      sleeper: d.sleeperPrice,
      lowerBerth: d.lowerBerthPrice,
      upperBerth: d.upperBerthPrice
    },
    exclusiveDiscount: d.exclusiveDiscount ?? 100,
    tripGuaranteePrice: d.tripGuaranteePrice ?? 24,
    distanceKm: d.distanceKm || 0,
    onTimePercent: d.onTimePercent ?? 86,
    onTimeTrips: d.onTimeTrips ?? 957,
    onTimeTotal: d.onTimeTotal ?? 1113,
    layoutPreset: d.layoutPreset || "",
    cancellationPolicy: d.cancellationPolicy || [],
    restStops: d.restStops || [],
    routeStops: d.routeStops || [],
    policies: d.policies || {},
    liveTracking: d.liveTracking || {},
    bookedSeatGenders: d.bookedSeatGenders || {}
  };
}

async function reserveBusSeats(tripId, seats, gender = "M") {
  if (!tripId || !mongoose.isValidObjectId(tripId) || !seats?.length) return;
  const trip = await BusTrip.findById(tripId);
  if (!trip) return;
  const next = new Set(trip.bookedSeats || []);
  const genders = { ...(trip.bookedSeatGenders || {}) };
  seats.forEach((id) => {
    if (!id) return;
    next.add(String(id));
    genders[String(id)] = gender === "F" ? "F" : "M";
  });
  trip.bookedSeats = [...next];
  trip.bookedSeatGenders = genders;
  trip.markModified("bookedSeatGenders");
  await trip.save();
}

async function releaseBusSeats(tripId, seats) {
  if (!tripId || !mongoose.isValidObjectId(tripId) || !seats?.length) return;
  const trip = await BusTrip.findById(tripId);
  if (!trip) return;
  const drop = new Set(seats.map(String));
  trip.bookedSeats = (trip.bookedSeats || []).filter((id) => !drop.has(String(id)));
  const genders = { ...(trip.bookedSeatGenders || {}) };
  drop.forEach((id) => {
    delete genders[id];
  });
  trip.bookedSeatGenders = genders;
  trip.markModified("bookedSeatGenders");
  await trip.save();
}

async function stampVendorOnBus(req, value, existing = null) {
  return applyAuthenticatedVendorOwnership(req, value, existing);
}

async function listBuses(req, res) {
  const pq = parseListQuery(req);
  const isAdmin = req.user && ["super_admin", "vendor_admin"].includes(req.user.role);
  const filter = isAdmin && req.query.admin === "1" ? { ...listFilterForVendor(req) } : { status: "active" };

  const from = normCity(req.query.from);
  const to = normCity(req.query.to);
  if (from) filter.fromCity = new RegExp(from, "i");
  if (to) filter.toCity = new RegExp(to, "i");

  const { data, meta } = await paginatedFind(BusTrip, filter, pq, { departureTime: 1 });
  res.json({ success: true, data: data.map(toApiRow), meta });
}

async function getBusById(req, res) {
  const id = req.params.id;
  let doc = null;
  if (mongoose.isValidObjectId(id)) {
    doc = await BusTrip.findById(id);
  }
  if (!doc) throw new HttpError(404, "Bus trip not found");
  if (doc.status !== "active") {
    if (isSuperAdminUser(req)) {
      /* super admin may inspect drafts */
    } else if (req.user?.role === "vendor_admin") {
      const owned = await BusTrip.findOne(docMatchForVendor(req, doc._id)).select("_id").lean();
      if (!owned) throw new HttpError(404, "Bus trip not found");
    } else {
      throw new HttpError(404, "Bus trip not found");
    }
  }
  res.json({ success: true, data: toApiRow(doc) });
}

async function createBus(req, res) {
  const { error, value } = busSchema.validate(req.body, { stripUnknown: true, convert: true });
  if (error) throw new HttpError(400, error.message);
  const payload = await stampVendorOnBus(req, value);
  const data = await BusTrip.create(payload);
  await logAudit({ req, action: "create", entity: "busTrip", entityId: data._id, after: data.toObject() });
  res.status(201).json({ success: true, data: toApiRow(data) });
}

async function updateBus(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, "Invalid id");
  const { error, value } = busSchema.validate(req.body, { stripUnknown: true, convert: true });
  if (error) throw new HttpError(400, error.message);
  const payload = await stampVendorOnBus(req, value);
  const data = await BusTrip.findOneAndUpdate(docMatchForVendor(req, req.params.id), payload, {
    new: true,
    runValidators: true
  });
  if (!data) throw new HttpError(404, "Bus trip not found");
  await logAudit({ req, action: "update", entity: "busTrip", entityId: data._id, after: data.toObject() });
  res.json({ success: true, data: toApiRow(data) });
}

async function deleteBus(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, "Invalid id");
  const data = await BusTrip.findOneAndDelete(docMatchForVendor(req, req.params.id));
  if (!data) throw new HttpError(404, "Bus trip not found");
  await logAudit({ req, action: "delete", entity: "busTrip", entityId: data._id, before: data.toObject() });
  res.json({ success: true, message: "Bus trip deleted" });
}

async function duplicateBus(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, "Invalid id");
  const source = await BusTrip.findOne(docMatchForVendor(req, req.params.id)).lean();
  if (!source) throw new HttpError(404, "Bus trip not found");
  const clone = { ...source };
  delete clone._id;
  delete clone.createdAt;
  delete clone.updatedAt;
  clone.operator = `${clone.operator} (Copy)`;
  clone.slug = "";
  clone.status = "inactive";
  const payload = await stampVendorOnBus(req, clone, source);
  const data = await BusTrip.create(payload);
  await logAudit({ req, action: "duplicate", entity: "busTrip", entityId: data._id, after: data.toObject() });
  res.status(201).json({ success: true, data: toApiRow(data), message: "Bus duplicated (inactive draft)" });
}

/** Bulk create sample bus trips from admin import. */
async function importSampleBuses(req, res) {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  if (!items.length) throw new HttpError(400, "No bus trips to import.");

  let created = 0;
  const results = [];
  for (const raw of items) {
    const { error, value } = busSchema.validate(raw, { stripUnknown: true, convert: true });
    if (error) continue;
    const existing = await BusTrip.findOne({
      operator: value.operator,
      fromCity: value.fromCity,
      toCity: value.toCity,
      departureTime: value.departureTime,
      busType: value.busType
    });
    if (existing) {
      results.push({ id: String(existing._id), skipped: true });
      continue;
    }
    const payload = await stampVendorOnBus(req, value);
    const data = await BusTrip.create(payload);
    created += 1;
    results.push({ id: String(data._id), skipped: false });
  }

  await logAudit({ req, action: "import", entity: "busTrip", after: { created } });
  res.json({
    success: true,
    data: { created, results },
    message: `Imported ${created} bus trips.`
  });
}

module.exports = {
  listBuses,
  getBusById,
  createBus,
  updateBus,
  deleteBus,
  duplicateBus,
  importSampleBuses,
  reserveBusSeats,
  releaseBusSeats
};
