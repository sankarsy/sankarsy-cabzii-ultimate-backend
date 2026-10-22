const Joi = require("joi");
const mongoose = require("mongoose");
const { RouteFare } = require("../models/RouteFare");
const { HttpError } = require("../utils/httpError");
const { logAudit } = require("../services/auditService");
const { citySlug, findRouteFare, pricesFromDoc, upsertRouteFare } = require("../utils/routeCategoryFare");

const fareSchema = Joi.object({
  fromCitySlug: Joi.string().required(),
  toCitySlug: Joi.string().required(),
  fromName: Joi.string().allow("").default(""),
  toName: Joi.string().allow("").default(""),
  hatchback: Joi.number().min(0).default(0),
  sedan: Joi.number().min(0).default(0),
  suv: Joi.number().min(0).default(0),
  van: Joi.number().min(0).default(0)
});

async function listRouteFares(req, res) {
  const from = citySlug(req.query.from || req.query.fromCitySlug);
  const to = citySlug(req.query.to || req.query.toCitySlug);
  if (from && to) {
    const data = await findRouteFare(from, to);
    return res.json({ success: true, data: data || null });
  }

  const isAdmin = req.user && ["super_admin", "vendor_admin"].includes(req.user.role);
  if (!isAdmin) {
    throw new HttpError(400, "from and to city are required.");
  }

  const data = await RouteFare.find({}).sort({ fromCitySlug: 1, toCitySlug: 1 }).lean();
  res.json({ success: true, data });
}

async function createRouteFare(req, res) {
  const { error, value } = fareSchema.validate(req.body, { stripUnknown: true, convert: true });
  if (error) throw new HttpError(400, error.message);
  const from = citySlug(value.fromCitySlug);
  const to = citySlug(value.toCitySlug);
  if (!from || !to) throw new HttpError(400, "From city and to city are required.");
  if (from === to) throw new HttpError(400, "Pickup and drop must be different cities.");
  const data = await upsertRouteFare(value);
  await logAudit({ req, action: "upsert", entity: "route_fare", entityId: data._id, after: data.toObject() });
  res.status(201).json({ success: true, data });
}

async function updateRouteFare(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, "Invalid id");
  const existing = await RouteFare.findById(req.params.id);
  if (!existing) throw new HttpError(404, "Route fare not found");
  const { error, value } = fareSchema.validate(
    {
      fromCitySlug: existing.fromCitySlug,
      toCitySlug: existing.toCitySlug,
      fromName: existing.fromName,
      toName: existing.toName,
      ...pricesFromDoc(existing),
      ...req.body
    },
    { stripUnknown: true, convert: true }
  );
  if (error) throw new HttpError(400, error.message);
  const data = await upsertRouteFare({ ...value, fromCitySlug: existing.fromCitySlug, toCitySlug: existing.toCitySlug });
  await logAudit({ req, action: "update", entity: "route_fare", entityId: data._id, after: data.toObject() });
  res.json({ success: true, data });
}

async function deleteRouteFare(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, "Invalid id");
  const data = await RouteFare.findByIdAndDelete(req.params.id);
  if (!data) throw new HttpError(404, "Route fare not found");
  await logAudit({ req, action: "delete", entity: "route_fare", entityId: data._id, before: data.toObject() });
  res.json({ success: true, message: "Route fare deleted" });
}

module.exports = {
  listRouteFares,
  createRouteFare,
  updateRouteFare,
  deleteRouteFare
};
