const Joi = require("joi");
const mongoose = require("mongoose");
const { Driver } = require("../models/Driver");
const { HttpError } = require("../utils/httpError");
const { logAudit } = require("../services/auditService");
const { docMatchForVendor, listFilterForVendor } = require("../utils/vendorAccess");
const { splitSeoStrings } = require("../utils/splitSeoStrings");
const { parseListQuery, buildDriverListFilter, paginatedFind } = require("../utils/listQuery");

const driverCoreSchema = Joi.object({
  name: Joi.string().required(),
  vendor: Joi.string().allow("").default(""),
  experience: Joi.string().default("0 Years"),
  trips: Joi.number().integer().min(0).default(0),
  rating: Joi.string().default("0.0"),
  languages: Joi.array().items(Joi.string()).default([]),
  supportedVehicles: Joi.array().items(Joi.string()).default([]),
  pricing: Joi.object({
    hourly: Joi.number().default(0),
    day: Joi.number().default(0),
    extraHour: Joi.number().default(0)
  }).default({ hourly: 0, day: 0, extraHour: 0 })
});

async function listDrivers(req, res) {
  const base = listFilterForVendor(req);
  const pq = parseListQuery(req);
  const filter = buildDriverListFilter(base, pq);
  const { data, meta } = await paginatedFind(Driver, filter, pq);
  res.json({ success: true, data, meta });
}

async function getDriverById(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, "Invalid id");
  const match = docMatchForVendor(req, req.params.id);
  const data = await Driver.findOne(match).lean();
  if (!data) throw new HttpError(404, "Driver not found");
  res.json({ success: true, data });
}

async function createDriver(req, res) {
  const { core, seo, seoTitle, seoDescription } = splitSeoStrings(req.body);
  const { error, value } = driverCoreSchema.validate(core, { stripUnknown: true, convert: true });
  if (error) throw new HttpError(400, error.message);
  const payload = { ...value, seo, seoTitle, seoDescription };
  if (req.user?.role === "vendor_admin") {
    payload.vendorAdminPhone = req.user.phone;
    payload.vendor = req.user.vendorName || payload.vendor;
  }
  const data = await Driver.create(payload);
  await logAudit({
    req,
    action: "create",
    entity: "driver",
    entityId: data._id,
    vendor: data.vendor,
    after: data.toObject()
  });
  res.status(201).json({ success: true, data });
}

async function updateDriver(req, res) {
  const { core, seo, seoTitle, seoDescription } = splitSeoStrings(req.body);
  const { error, value } = driverCoreSchema.validate(core, { stripUnknown: true, convert: true });
  if (error) throw new HttpError(400, error.message);
  const match = docMatchForVendor(req, req.params.id);
  const nextValue = { ...value, seo, seoTitle, seoDescription };
  if (req.user?.role === "vendor_admin") {
    nextValue.vendorAdminPhone = req.user.phone;
    nextValue.vendor = req.user.vendorName || nextValue.vendor;
  }
  const data = await Driver.findOneAndUpdate(match, nextValue, { new: true });
  if (!data) throw new HttpError(404, "Driver not found");
  await logAudit({
    req,
    action: "update",
    entity: "driver",
    entityId: data._id,
    vendor: data.vendor,
    after: data.toObject()
  });
  res.json({ success: true, data });
}

async function deleteDriver(req, res) {
  const filter = docMatchForVendor(req, req.params.id);
  const data = await Driver.findOneAndDelete(filter);
  if (!data) throw new HttpError(404, "Driver not found");
  await logAudit({
    req,
    action: "delete",
    entity: "driver",
    entityId: data._id,
    vendor: data.vendor,
    before: data.toObject()
  });
  res.json({ success: true, message: "Driver deleted" });
}

module.exports = { listDrivers, getDriverById, createDriver, updateDriver, deleteDriver };
