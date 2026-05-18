const Joi = require("joi");
const mongoose = require("mongoose");
const { City } = require("../models/City");
const { HttpError } = require("../utils/httpError");
const { logAudit } = require("../services/auditService");

const citySchema = Joi.object({
  name: Joi.string().required(),
  state: Joi.string().allow("").default(""),
  country: Joi.string().allow("").default("India"),
  isActive: Joi.boolean().default(true),
  sortOrder: Joi.number().default(0)
});

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
  const { error, value } = citySchema.validate(req.body, { stripUnknown: true });
  if (error) throw new HttpError(400, error.message);
  const data = await City.create(value);
  await logAudit({ req, action: "create", entity: "city", entityId: data._id, after: data.toObject() });
  res.status(201).json({ success: true, data });
}

async function updateCity(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, "Invalid id");
  const { error, value } = citySchema.validate(req.body, { stripUnknown: true });
  if (error) throw new HttpError(400, error.message);
  const data = await City.findByIdAndUpdate(req.params.id, value, { new: true, runValidators: true });
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

module.exports = { listCities, getCityById, createCity, updateCity, deleteCity };
