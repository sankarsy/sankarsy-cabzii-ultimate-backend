const Joi = require("joi");
const mongoose = require("mongoose");
const { BusTrip } = require("../models/BusTrip");
const { HttpError } = require("../utils/httpError");
const { logAudit } = require("../services/auditService");
const { parseListQuery, paginatedFind } = require("../utils/listQuery");

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
  amenities: Joi.array().items(Joi.string()).default([]),
  rating: Joi.number().default(4.2),
  reviewCount: Joi.number().default(100),
  status: Joi.string().valid("active", "inactive").default("active"),
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
    }
  };
}

async function listBuses(req, res) {
  const pq = parseListQuery(req);
  const isAdmin = req.user && ["super_admin", "vendor_admin"].includes(req.user.role);
  const filter = isAdmin && req.query.admin === "1" ? {} : { status: "active" };

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
  if (doc.status !== "active" && !req.user) throw new HttpError(404, "Bus trip not found");
  res.json({ success: true, data: toApiRow(doc) });
}

async function createBus(req, res) {
  const { error, value } = busSchema.validate(req.body, { stripUnknown: true, convert: true });
  if (error) throw new HttpError(400, error.message);
  const data = await BusTrip.create(value);
  await logAudit({ req, action: "create", entity: "busTrip", entityId: data._id, after: data.toObject() });
  res.status(201).json({ success: true, data: toApiRow(data) });
}

async function updateBus(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, "Invalid id");
  const { error, value } = busSchema.validate(req.body, { stripUnknown: true, convert: true });
  if (error) throw new HttpError(400, error.message);
  const data = await BusTrip.findByIdAndUpdate(req.params.id, value, { new: true, runValidators: true });
  if (!data) throw new HttpError(404, "Bus trip not found");
  await logAudit({ req, action: "update", entity: "busTrip", entityId: data._id, after: data.toObject() });
  res.json({ success: true, data: toApiRow(data) });
}

async function deleteBus(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, "Invalid id");
  const data = await BusTrip.findByIdAndDelete(req.params.id);
  if (!data) throw new HttpError(404, "Bus trip not found");
  await logAudit({ req, action: "delete", entity: "busTrip", entityId: data._id, before: data.toObject() });
  res.json({ success: true, message: "Bus trip deleted" });
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
    const data = await BusTrip.create(value);
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

module.exports = { listBuses, getBusById, createBus, updateBus, deleteBus, importSampleBuses };
