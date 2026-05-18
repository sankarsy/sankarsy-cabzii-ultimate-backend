const Joi = require("joi");
const mongoose = require("mongoose");
const { Cab } = require("../models/Cab");
const { HttpError } = require("../utils/httpError");
const { logAudit } = require("../services/auditService");
const { docMatchForVendor, listFilterForVendor } = require("../utils/vendorAccess");
const { splitSeoStrings } = require("../utils/splitSeoStrings");
const { parseListQuery, buildCabListFilter, paginatedFind } = require("../utils/listQuery");

const cabCoreSchema = Joi.object({
  title: Joi.string().required(),
  vendor: Joi.string().required(),
  type: Joi.string().required(),
  seats: Joi.number().integer().min(1).default(4),
  price: Joi.number().required(),
  hourlyRate: Joi.number().default(0),
  dayRate: Joi.number().default(0),
  extraHourRate: Joi.number().default(0),
  originalPrice: Joi.number().default(0),
  discountPercentage: Joi.number().default(0),
  rating: Joi.number().min(0).max(5).optional(),
  image: Joi.string().allow("").default(""),
  features: Joi.array().items(Joi.string()).default([])
});

async function listCabs(req, res) {
  const base = listFilterForVendor(req);
  const pq = parseListQuery(req);
  const filter = buildCabListFilter(base, pq);
  const { data, meta } = await paginatedFind(Cab, filter, pq);
  res.json({ success: true, data, meta });
}

async function getCabById(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, "Invalid id");
  const match = docMatchForVendor(req, req.params.id);
  const data = await Cab.findOne(match).lean();
  if (!data) throw new HttpError(404, "Cab not found");
  res.json({ success: true, data });
}

async function createCab(req, res) {
  const { core, seo, seoTitle, seoDescription } = splitSeoStrings(req.body);
  const { error, value } = cabCoreSchema.validate(core, { stripUnknown: true, convert: true });
  if (error) throw new HttpError(400, error.message);
  const payload = { ...value, seo, seoTitle, seoDescription };
  if (req.user?.role === "vendor_admin") {
    payload.vendorAdminPhone = req.user.phone;
    payload.vendor = req.user.vendorName || payload.vendor;
  }
  const data = await Cab.create(payload);
  await logAudit({
    req,
    action: "create",
    entity: "cab",
    entityId: data._id,
    vendor: data.vendor,
    after: data.toObject()
  });
  res.status(201).json({ success: true, data });
}

async function updateCab(req, res) {
  const { core, seo, seoTitle, seoDescription } = splitSeoStrings(req.body);
  const { error, value } = cabCoreSchema.validate(core, { stripUnknown: true, convert: true });
  if (error) throw new HttpError(400, error.message);
  const match = docMatchForVendor(req, req.params.id);
  const nextValue = { ...value, seo, seoTitle, seoDescription };
  if (req.user?.role === "vendor_admin") {
    nextValue.vendorAdminPhone = req.user.phone;
    nextValue.vendor = req.user.vendorName || nextValue.vendor;
  }
  const data = await Cab.findOneAndUpdate(match, nextValue, { new: true });
  if (!data) throw new HttpError(404, "Cab not found");
  await logAudit({
    req,
    action: "update",
    entity: "cab",
    entityId: data._id,
    vendor: data.vendor,
    after: data.toObject()
  });
  res.json({ success: true, data });
}

async function deleteCab(req, res) {
  const filter = docMatchForVendor(req, req.params.id);
  const data = await Cab.findOneAndDelete(filter);
  if (!data) throw new HttpError(404, "Cab not found");
  await logAudit({
    req,
    action: "delete",
    entity: "cab",
    entityId: data._id,
    vendor: data.vendor,
    before: data.toObject()
  });
  res.json({ success: true, message: "Cab deleted" });
}

module.exports = { listCabs, getCabById, createCab, updateCab, deleteCab };
