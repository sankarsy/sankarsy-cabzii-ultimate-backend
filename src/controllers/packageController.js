const Joi = require("joi");
const mongoose = require("mongoose");
const { Package } = require("../models/Package");
const { HttpError } = require("../utils/httpError");
const { logAudit } = require("../services/auditService");
const { docMatchForVendor, listFilterForVendor, vendorNameForUser } = require("../utils/vendorAccess");
const {
  splitCatalogBody,
  normalizeCatalogProduct,
  ensureUniqueSlug,
  catalogLookupQuery,
  joiFields: catalogJoiFields
} = require("../utils/catalogProductFields");
const { parseListQuery, buildPackageListFilter, paginatedFind, catalogListFilter, isCatalogAdmin } = require("../utils/listQuery");

const packageCoreSchema = Joi.object({
  name: Joi.string().required(),
  vendor: Joi.string().required(),
  duration: Joi.string().allow("").default(""),
  price: Joi.number().required(),
  originalPrice: Joi.number().default(0),
  discountPercentage: Joi.number().default(0),
  hourlyRate: Joi.number().default(0),
  dayRate: Joi.number().default(0),
  extraHourRate: Joi.number().default(0),
  image: Joi.string().allow("").default(""),
  gallery: Joi.array().items(Joi.string()).max(3).default([]),
  city: Joi.string().allow("").default(""),
  location: Joi.string().allow("").default(""),
  tags: Joi.array().items(Joi.string()).default([]),
  category: Joi.string()
    .valid("pilgrimage", "beach", "hill", "heritage", "honeymoon", "adventure", "family", "")
    .allow("")
    .default(""),
  cabTypes: Joi.array()
    .items(
      Joi.object({
        id: Joi.string().allow("").default(""),
        label: Joi.string().allow("").default(""),
        seats: Joi.number().integer().min(1).default(4),
        multiplier: Joi.number().min(0.5).max(3).default(1)
      })
    )
    .default([]),
  status: Joi.string().valid("active", "inactive").default("active")
}).concat(Joi.object(catalogJoiFields));

async function listPackages(req, res) {
  const base = catalogListFilter(req, listFilterForVendor(req));
  const pq = parseListQuery(req);
  const filter = buildPackageListFilter(base, pq);
  const { data, meta } = await paginatedFind(Package, filter, pq);
  res.json({ success: true, data, meta });
}

async function getPackageById(req, res) {
  const lookup = catalogLookupQuery(req.params.id);
  const scope = listFilterForVendor(req);
  const match = lookup._id ? { _id: lookup._id, ...scope } : { slug: lookup.slug, ...scope };
  const data = await Package.findOne(match).lean();
  if (!data) throw new HttpError(404, "Package not found");
  const isPublic = !isCatalogAdmin(req);
  if (isPublic && (data.isDeleted || (data.status && data.status !== "active"))) {
    throw new HttpError(404, "Package not found");
  }
  res.json({ success: true, data });
}

async function createPackage(req, res) {
  const { core, product } = splitCatalogBody(req.body);
  const { error, value } = packageCoreSchema.validate({ ...core, ...product }, { stripUnknown: true, convert: true });
  if (error) throw new HttpError(400, error.message);
  const productFields = normalizeCatalogProduct(product, {
    title: value.name,
    vendor: value.vendor,
    type: value.category || "package",
    city: value.city
  });
  productFields.slug = await ensureUniqueSlug(Package, productFields.slug);
  const payload = { ...value, ...productFields };
  if (req.user?.role === "vendor_admin") {
    payload.vendorAdminPhone = req.user.mobileNumber;
    payload.vendor = vendorNameForUser(req.user) || payload.vendor;
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
  const { core, product } = splitCatalogBody(req.body);
  const { error, value } = packageCoreSchema.validate({ ...core, ...product }, { stripUnknown: true, convert: true });
  if (error) throw new HttpError(400, error.message);
  const lookup = catalogLookupQuery(req.params.id);
  const scope = listFilterForVendor(req);
  const match = lookup._id ? { _id: lookup._id, ...scope } : { slug: lookup.slug, ...scope };
  const existing = await Package.findOne(match).lean();
  if (!existing) throw new HttpError(404, "Package not found");
  const productFields = normalizeCatalogProduct(product, {
    title: value.name || existing.name,
    vendor: value.vendor || existing.vendor,
    type: value.category || existing.category || "package",
    city: value.city || existing.city
  });
  productFields.slug = await ensureUniqueSlug(Package, productFields.slug, existing._id);
  const nextValue = { ...value, ...productFields };
  if (req.user?.role === "vendor_admin") {
    nextValue.vendorAdminPhone = req.user.mobileNumber;
    nextValue.vendor = vendorNameForUser(req.user) || nextValue.vendor;
  }
  const data = await Package.findOneAndUpdate(match, { $set: nextValue }, { new: true, runValidators: true });
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
