const Joi = require("joi");
const mongoose = require("mongoose");
const { City } = require("../models/City");
const { HttpError } = require("../utils/httpError");
const { logAudit } = require("../services/auditService");
const { slugify } = require("../utils/slugify");

const faqItemJoi = Joi.object({
  question: Joi.string().required(),
  answer: Joi.string().allow("").default("")
});

const citySchema = Joi.object({
  name: Joi.string().required(),
  slug: Joi.string().allow("").default(""),
  state: Joi.string().allow("").default(""),
  country: Joi.string().allow("").default("India"),
  isActive: Joi.boolean().default(true),
  sortOrder: Joi.number().default(0),
  metaTitle: Joi.string().allow("").default(""),
  metaDescription: Joi.string().allow("").default(""),
  keywords: Joi.string().allow("").default(""),
  content: Joi.string().allow("").default(""),
  faqs: Joi.array().items(faqItemJoi).default([]),
  schemaJson: Joi.string().allow("").default(""),
  popularLocations: Joi.array().items(Joi.string()).default([]),
  airportDetails: Joi.string().allow("").default(""),
  popularRoutes: Joi.array().items(Joi.string()).default([]),
  popularPackages: Joi.array().items(Joi.string()).default([]),
  image: Joi.string().allow("").default(""),
  banner: Joi.string().allow("").default("")
});

function normalizeCityPayload(value) {
  const out = { ...value };
  if (out.slug) out.slug = slugify(out.slug);
  else if (out.name) out.slug = slugify(out.name);
  return out;
}

async function listCities(req, res) {
  const activeOnly = req.query.active !== "0" && req.query.active !== "false";
  const filter = activeOnly ? { isActive: true } : {};
  const data = await City.find(filter).sort({ sortOrder: 1, name: 1 }).lean();
  res.json({ success: true, data });
}

async function getCityById(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, "Invalid id");
  const data = await City.findById(req.params.id).lean();
  if (!data) throw new HttpError(404, "City not found");
  res.json({ success: true, data });
}

async function createCity(req, res) {
  const { error, value } = citySchema.validate(req.body, { stripUnknown: true, convert: true });
  if (error) throw new HttpError(400, error.message);
  const data = await City.create(normalizeCityPayload(value));
  await logAudit({ req, action: "create", entity: "city", entityId: data._id, after: data.toObject() });
  res.status(201).json({ success: true, data });
}

async function updateCity(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, "Invalid id");
  const { error, value } = citySchema.validate(req.body, { stripUnknown: true, convert: true });
  if (error) throw new HttpError(400, error.message);
  const data = await City.findByIdAndUpdate(req.params.id, normalizeCityPayload(value), {
    new: true,
    runValidators: true
  });
  if (!data) throw new HttpError(404, "City not found");
  await logAudit({ req, action: "update", entity: "city", entityId: data._id, after: data.toObject() });
  res.json({ success: true, data });
}

async function deleteCity(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, "Invalid id");
  const data = await City.findByIdAndDelete(req.params.id);
  if (!data) throw new HttpError(404, "City not found");
  await logAudit({ req, action: "delete", entity: "city", entityId: data._id, before: data.toObject() });
  res.json({ success: true, message: "City deleted" });
}

async function bulkUpdateCities(req, res) {
  const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
  let updated = 0;
  for (const row of rows.slice(0, 200)) {
    if (!row.id || !mongoose.isValidObjectId(row.id)) continue;
    const { error, value } = citySchema.validate(row, { stripUnknown: true, convert: true });
    if (error) continue;
    await City.findByIdAndUpdate(row.id, normalizeCityPayload(value));
    updated += 1;
  }
  res.json({ success: true, data: { updated } });
}

module.exports = { listCities, getCityById, createCity, updateCity, deleteCity, bulkUpdateCities };
