const Joi = require("joi");
const mongoose = require("mongoose");
const { Package } = require("../models/Package");
const { HttpError } = require("../utils/httpError");
const { logAudit } = require("../services/auditService");
const { docMatchForVendor, listFilterForVendor } = require("../utils/vendorAccess");
const { splitSeoStrings } = require("../utils/splitSeoStrings");
const { parseListQuery, buildPackageListFilter, paginatedFind } = require("../utils/listQuery");

const packageCoreSchema = Joi.object({
  name: Joi.string().required(),
  vendor: Joi.string().required(),
  duration: Joi.string().required(),
  price: Joi.number().required(),
  originalPrice: Joi.number().default(0),
  discountPercentage: Joi.number().default(0),
  hourlyRate: Joi.number().default(0),
  dayRate: Joi.number().default(0),
  extraHourRate: Joi.number().default(0),
  image: Joi.string().allow("").default(""),
  tags: Joi.array().items(Joi.string()).default([])
});

async function listPackages(req, res) {
  const base = listFilterForVendor(req);
  const pq = parseListQuery(req);
  const filter = buildPackageListFilter(base, pq);
  const { data, meta } = await paginatedFind(Package, filter, pq);
  res.json({ success: true, data, meta });
}

async function getPackageById(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, "Invalid id");
  const match = docMatchForVendor(req, req.params.id);
  const data = await Package.findOne(match).lean();
  if (!data) throw new HttpError(404, "Package not found");
  res.json({ success: true, data });
}

async function createPackage(req, res) {
  const { core, seo, seoTitle, seoDescription } = splitSeoStrings(req.body);
  const { error, value } = packageCoreSchema.validate(core, { stripUnknown: true, convert: true });
  if (error) throw new HttpError(400, error.message);
  const payload = { ...value, seo, seoTitle, seoDescription };
  if (req.user?.role === "vendor_admin") {
    payload.vendorAdminPhone = req.user.phone;
    payload.vendor = req.user.vendorName || payload.vendor;
  }
  const data = await Package.create(payload);
  await logAudit({
    req,
    action: "create",
    entity: "package",
    entityId: data._id,
    vendor: data.vendor,
    after: data.toObject()
  });
  res.status(201).json({ success: true, data });
}

async function updatePackage(req, res) {
  const { core, seo, seoTitle, seoDescription } = splitSeoStrings(req.body);
  const { error, value } = packageCoreSchema.validate(core, { stripUnknown: true, convert: true });
  if (error) throw new HttpError(400, error.message);
  const match = docMatchForVendor(req, req.params.id);
  const nextValue = { ...value, seo, seoTitle, seoDescription };
  if (req.user?.role === "vendor_admin") {
    nextValue.vendorAdminPhone = req.user.phone;
    nextValue.vendor = req.user.vendorName || nextValue.vendor;
  }
  const data = await Package.findOneAndUpdate(match, nextValue, { new: true });
  if (!data) throw new HttpError(404, "Package not found");
  await logAudit({
    req,
    action: "update",
    entity: "package",
    entityId: data._id,
    vendor: data.vendor,
    after: data.toObject()
  });
  res.json({ success: true, data });
}

async function deletePackage(req, res) {
  const filter = docMatchForVendor(req, req.params.id);
  const data = await Package.findOneAndDelete(filter);
  if (!data) throw new HttpError(404, "Package not found");
  await logAudit({
    req,
    action: "delete",
    entity: "package",
    entityId: data._id,
    vendor: data.vendor,
    before: data.toObject()
  });
  res.json({ success: true, message: "Package deleted" });
}

module.exports = { listPackages, getPackageById, createPackage, updatePackage, deletePackage };
