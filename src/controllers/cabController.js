const Joi = require("joi");
const mongoose = require("mongoose");
const { Cab } = require("../models/Cab");
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
const { mergeFarePackages, resolveFarePackages } = require("../utils/cabFarePackages");
const { parseListQuery, buildCabListFilter, paginatedFind, catalogListFilter, isCatalogAdmin } = require("../utils/listQuery");
const { normalizeCabForApi } = require("../utils/catalogNormalize");
const { normalizeCatalogMediaFields } = require("../utils/mediaPath");

const packageFareSchema = Joi.object({
  originalPrice: Joi.number().default(0),
  price: Joi.number().default(0),
  discountPercentage: Joi.number().default(0),
  extraKmRate: Joi.number().default(0),
  extraHourRate: Joi.number().default(0)
});

const farePackagesSchema = Joi.object({
  local4hr: packageFareSchema,
  local8hr: packageFareSchema,
  outstationOneWay: packageFareSchema,
  outstationRoundTrip: packageFareSchema
});

const farePackageLabelsSchema = Joi.object({
  local4hr: Joi.string().allow("").optional(),
  local8hr: Joi.string().allow("").optional(),
  localDay: Joi.string().allow("").optional(),
  outstation12hr: Joi.string().allow("").optional(),
  outstationOneWay: Joi.string().allow("").optional(),
  outstationRoundTrip: Joi.string().allow("").optional()
}).optional();

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
  gallery: Joi.array().items(Joi.string()).max(3).default([]),
  city: Joi.string().allow("").default(""),
  location: Joi.string().allow("").default(""),
  features: Joi.array().items(Joi.string()).default([]),
  farePackages: farePackagesSchema.optional(),
  farePackageLabels: farePackageLabelsSchema,
  status: Joi.string().valid("active", "inactive").default("active")
}).concat(Joi.object(catalogJoiFields));

async function mergeCabProductFields(product, core, existingId) {
  const normalized = normalizeCatalogProduct(product, {
    title: core.title,
    vendor: core.vendor,
    type: core.type,
    city: core.city
  });
  normalized.slug = await ensureUniqueSlug(Cab, normalized.slug, existingId);
  return normalized;
}

function mergeFarePackageLabels(existing, incoming) {
  if (!incoming || typeof incoming !== "object") return existing || {};
  return { ...(existing || {}), ...incoming };
}

function withFarePackages(value, existing = {}) {
  let farePackageLabels = existing.farePackageLabels || {};
  if (value.farePackageLabels && typeof value.farePackageLabels === "object") {
    farePackageLabels = mergeFarePackageLabels(existing.farePackageLabels, value.farePackageLabels);
  }
  return {
    ...value,
    farePackages: resolveFarePackages(value, existing.farePackages),
    farePackageLabels
  };
}

async function listCabs(req, res) {
  const base = catalogListFilter(req, listFilterForVendor(req));
  const pq = parseListQuery(req);
  const filter = buildCabListFilter(base, pq);
  const { data, meta } = await paginatedFind(Cab, filter, pq);
  res.json({ success: true, data: data.map(normalizeCabForApi), meta });
}

async function getCabById(req, res) {
  const param = req.params.id;
  if (!param) throw new HttpError(400, "Invalid id");
  const lookup = catalogLookupQuery(param);
  const scope = listFilterForVendor(req);
  const match = lookup._id ? { _id: lookup._id, ...scope } : { slug: lookup.slug, ...scope };
  const data = await Cab.findOne(match).lean();
  if (!data) throw new HttpError(404, "Cab not found");
  const isPublic = !isCatalogAdmin(req);
  if (isPublic && (data.isDeleted || (data.status && data.status !== "active"))) {
    throw new HttpError(404, "Cab not found");
  }
  res.json({ success: true, data: normalizeCabForApi(data) });
}

async function createCab(req, res) {
  const { core, product } = splitCatalogBody(req.body);
  const { error, value } = cabCoreSchema.validate({ ...core, ...product }, { stripUnknown: true, convert: true });
  if (error) throw new HttpError(400, error.message);
  const productFields = await mergeCabProductFields(product, value);
  const payload = normalizeCatalogMediaFields({
    ...withFarePackages(value, {}),
    ...productFields
  });
  if (req.user?.role === "vendor_admin") {
    payload.vendorAdminPhone = req.user.mobileNumber;
    payload.vendor = vendorNameForUser(req.user) || payload.vendor;
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
  const { core, product } = splitCatalogBody(req.body);
  const { error, value } = cabCoreSchema.validate({ ...core, ...product }, { stripUnknown: true, convert: true });
  if (error) throw new HttpError(400, error.message);
  const lookup = catalogLookupQuery(req.params.id);
  const scope = listFilterForVendor(req);
  const match = lookup._id ? { _id: lookup._id, ...scope } : { slug: lookup.slug, ...scope };
  const existing = await Cab.findOne(match).lean();
  if (!existing) throw new HttpError(404, "Cab not found");

  const mergedCore = value.farePackages
    ? { ...value, farePackages: mergeFarePackages(existing.farePackages, value.farePackages) }
    : value;
  const productFields = await mergeCabProductFields(product, { ...mergedCore, ...existing }, existing._id);
  const nextValue = normalizeCatalogMediaFields({
    ...withFarePackages(mergedCore, existing),
    ...productFields
  });
  if (req.user?.role === "vendor_admin") {
    nextValue.vendorAdminPhone = req.user.mobileNumber;
    nextValue.vendor = vendorNameForUser(req.user) || nextValue.vendor;
  }
  const data = await Cab.findOneAndUpdate(match, { $set: nextValue }, { new: true, runValidators: true });
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
