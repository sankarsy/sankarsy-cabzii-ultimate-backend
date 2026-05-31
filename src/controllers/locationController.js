const Joi = require("joi");
const mongoose = require("mongoose");
const { Location } = require("../models/Location");
const { City } = require("../models/City");
const { HttpError } = require("../utils/httpError");
const { logAudit } = require("../services/auditService");

const locationSchema = Joi.object({
  city: Joi.string().required(),
  name: Joi.string().required(),
  address: Joi.string().allow("").default(""),
  pincode: Joi.string().allow("").default(""),
  lat: Joi.number().allow(null).optional(),
  lng: Joi.number().allow(null).optional(),
  isActive: Joi.boolean().default(true)
});

const CITY_ALIASES = {
  bangalore: "Bengaluru",
  bengaluru: "Bengaluru",
  madras: "Chennai",
  pondicherry: "Puducherry",
  puducherry: "Pondicherry",
  trichy: "Tiruchirappalli",
  tiruchy: "Tiruchirappalli",
  ooty: "Udhagamandalam",
  udhagai: "Udhagamandalam",
  tuticorin: "Thoothukudi"
};

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function resolveCityQuery(raw) {
  const term = String(raw || "").trim();
  if (!term) return "";
  const first = term.split(",")[0].trim();
  return CITY_ALIASES[first.toLowerCase()] || first;
}

async function buildCityFilter(cityQuery) {
  const canonical = resolveCityQuery(cityQuery);
  const escaped = escapeRegex(canonical);
  const cityDocs = await City.find({
    isActive: true,
    $or: [{ name: new RegExp(`^${escaped}$`, "i") }, { name: new RegExp(escaped, "i") }]
  }).lean();

  const clauses = [{ cityName: new RegExp(escaped, "i") }];
  const cityIds = cityDocs.map((c) => c._id);
  if (cityIds.length) clauses.push({ city: { $in: cityIds } });
  for (const doc of cityDocs) {
    clauses.push({ cityName: new RegExp(escapeRegex(doc.name), "i") });
  }
  return { $or: clauses };
}

async function listLocations(req, res) {
  const activeOnly = req.query.active !== "0" && req.query.active !== "false";
  const filter = activeOnly ? { isActive: true } : {};
  const and = [];

  if (req.query.cityId && mongoose.isValidObjectId(req.query.cityId)) {
    filter.city = req.query.cityId;
  } else if (req.query.city) {
    and.push(await buildCityFilter(req.query.city));
  }

  if (req.query.pincode) {
    const pin = String(req.query.pincode).trim();
    if (pin) filter.pincode = new RegExp(`^${escapeRegex(pin)}`);
  }

  if (req.query.q) {
    const q = new RegExp(String(req.query.q).trim(), "i");
    and.push({ $or: [{ name: q }, { address: q }, { cityName: q }, { pincode: q }] });
  }

  if (and.length) filter.$and = and;

  const data = await Location.find(filter).sort({ cityName: 1, name: 1 }).limit(500).lean();
  res.json({ success: true, data });
}

async function getLocationById(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, "Invalid id");
  const data = await Location.findById(req.params.id).lean();
  if (!data) throw new HttpError(404, "Location not found");
  res.json({ success: true, data });
}

async function createLocation(req, res) {
  const { error, value } = locationSchema.validate(req.body, { stripUnknown: true });
  if (error) throw new HttpError(400, error.message);
  if (!mongoose.isValidObjectId(value.city)) throw new HttpError(400, "Invalid city id");

  const cityDoc = await City.findById(value.city).lean();
  if (!cityDoc) throw new HttpError(400, "City not found");

  const data = await Location.create({
    ...value,
    cityName: cityDoc.state ? `${cityDoc.name}, ${cityDoc.state}` : cityDoc.name
  });

  await logAudit({ req, action: "create", entity: "location", entityId: data._id, after: data.toObject() });
  res.status(201).json({ success: true, data });
}

async function updateLocation(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, "Invalid id");
  const { error, value } = locationSchema.validate(req.body, { stripUnknown: true });
  if (error) throw new HttpError(400, error.message);
  if (!mongoose.isValidObjectId(value.city)) throw new HttpError(400, "Invalid city id");

  const cityDoc = await City.findById(value.city).lean();
  if (!cityDoc) throw new HttpError(400, "City not found");

  const data = await Location.findByIdAndUpdate(
    req.params.id,
    {
      ...value,
      cityName: cityDoc.state ? `${cityDoc.name}, ${cityDoc.state}` : cityDoc.name
    },
    { new: true, runValidators: true }
  );
  if (!data) throw new HttpError(404, "Location not found");

  await logAudit({ req, action: "update", entity: "location", entityId: data._id, after: data.toObject() });
  res.json({ success: true, data });
}

async function deleteLocation(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, "Invalid id");
  const data = await Location.findByIdAndDelete(req.params.id);
  if (!data) throw new HttpError(404, "Location not found");
  await logAudit({ req, action: "delete", entity: "location", entityId: data._id, before: data.toObject() });
  res.json({ success: true, message: "Location deleted" });
}

module.exports = { listLocations, getLocationById, createLocation, updateLocation, deleteLocation };
