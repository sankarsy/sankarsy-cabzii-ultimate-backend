const Joi = require("joi");
const mongoose = require("mongoose");
const { SeoService } = require("../models/SeoService");
const { HttpError } = require("../utils/httpError");
const { parseListQuery, paginatedFind } = require("../utils/listQuery");
const { logAudit } = require("../services/auditService");
const { slugify } = require("../utils/slugify");
const { ensureUniqueSlug } = require("../utils/catalogProductFields");
const { autoSeoServiceFields } = require("../utils/seoAutoFill");

const seoServiceSchema = Joi.object({
  slug: Joi.string().allow("").default(""),
  name: Joi.string().allow("").default(""),
  primaryKeyword: Joi.string().allow("").default(""),
  searchQuery: Joi.string().allow("").default(""),
  priceFrom: Joi.number().min(0).default(0),
  highlights: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string().allow("")).default([]),
  body: Joi.string().allow("").default(""),
  seo: Joi.string().allow("").default(""),
  seoTitle: Joi.string().allow("").default(""),
  seoDescription: Joi.string().allow("").default(""),
  published: Joi.boolean().default(true),
  showInMenu: Joi.boolean().default(false),
  menuLabel: Joi.string().allow("").default(""),
  menuSortOrder: Joi.number().default(0),
  menuCitySlug: Joi.string().allow("").default("chennai"),
  allCities: Joi.boolean().default(true),
  citySlugs: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string().allow("")).default([])
});

async function normalizePayload(value, excludeId) {
  const highlights = Array.isArray(value.highlights)
    ? value.highlights.map((h) => String(h).trim()).filter(Boolean)
    : String(value.highlights || "")
        .split(",")
        .map((h) => h.trim())
        .filter(Boolean);

  const citySlugs = Array.isArray(value.citySlugs)
    ? value.citySlugs.map((c) => slugify(c)).filter(Boolean)
    : String(value.citySlugs || "")
        .split(",")
        .map((c) => slugify(c))
        .filter(Boolean);

  const auto = autoSeoServiceFields(value);
  const seoTitle = String(value.seoTitle || auto.seoTitle || "").trim();
  const name = String(value.name || auto.name || seoTitle).trim();
  if (!seoTitle && !name) throw new HttpError(400, "SEO title is required.");

  const seo = String(value.seo || auto.seo || "").trim();
  const seoDescription = String(value.seoDescription || auto.seoDescription || "").trim();
  const primaryKeyword = String(value.primaryKeyword || seo.split(",")[0] || name).trim();
  const searchQuery = String(value.searchQuery || seoTitle || primaryKeyword).trim();

  const baseSlug = slugify(value.slug) || slugify(seoTitle) || slugify(name);
  if (!baseSlug) throw new HttpError(400, "Could not generate URL slug — add SEO title or slug.");

  const slug = await ensureUniqueSlug(SeoService, baseSlug, excludeId);

  return {
    ...value,
    slug,
    name: name || seoTitle,
    seoTitle: seoTitle || name,
    seo,
    seoDescription,
    primaryKeyword,
    searchQuery,
    highlights,
    citySlugs,
    menuCitySlug: slugify(value.menuCitySlug || "chennai") || "chennai"
  };
}

function withPublicUrl(doc) {
  if (!doc) return doc;
  const plain = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
  const city = plain.menuCitySlug || "chennai";
  return {
    ...plain,
    publicPath: `/services/${plain.slug}/${city}`,
    menuHref: `/services/${plain.slug}/${city}`
  };
}

async function listSeoServices(req, res) {
  const pq = parseListQuery(req);
  const isAdmin = req.user && ["super_admin", "vendor_admin"].includes(req.user.role);
  const includeAll = isAdmin && (req.query.admin === "1" || req.query.includeUnpublished === "1");
  const menuOnly = req.query.menu === "1";

  const filter = {};
  if (menuOnly) {
    filter.published = true;
    filter.showInMenu = true;
  } else if (!includeAll) {
    filter.published = true;
  }

  const { data, meta } = await paginatedFind(SeoService, filter, pq, { menuSortOrder: 1, name: 1 });
  res.json({
    success: true,
    data: data.map((row) => withPublicUrl(row)),
    meta
  });
}

async function getSeoServiceBySlug(req, res) {
  const isAdmin = req.user && ["super_admin", "vendor_admin"].includes(req.user.role);
  const param = req.params.slug;
  let doc;

  if (mongoose.isValidObjectId(param) && isAdmin) {
    doc = await SeoService.findById(param);
  } else {
    const filter = isAdmin ? { slug: param } : { slug: param, published: true };
    doc = await SeoService.findOne(filter);
  }

  if (!doc) return res.status(404).json({ success: false, message: "Service page not found" });
  res.json({ success: true, data: withPublicUrl(doc) });
}

async function createSeoService(req, res) {
  const { error, value } = seoServiceSchema.validate(req.body, { stripUnknown: true, convert: true });
  if (error) throw new HttpError(400, error.message);
  const payload = await normalizePayload(value);
  const data = await SeoService.create(payload);
  await logAudit({ req, action: "create", entity: "seo_service", entityId: data._id, after: data.toObject() });
  res.status(201).json({ success: true, data: withPublicUrl(data) });
}

async function updateSeoService(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, "Invalid id");
  const { error, value } = seoServiceSchema.validate(req.body, { stripUnknown: true, convert: true });
  if (error) throw new HttpError(400, error.message);
  const payload = await normalizePayload(value, req.params.id);
  const data = await SeoService.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
  if (!data) throw new HttpError(404, "Service page not found");
  await logAudit({ req, action: "update", entity: "seo_service", entityId: data._id, after: data.toObject() });
  res.json({ success: true, data: withPublicUrl(data) });
}

async function deleteSeoService(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, "Invalid id");
  const data = await SeoService.findByIdAndDelete(req.params.id);
  if (!data) throw new HttpError(404, "Service page not found");
  await logAudit({ req, action: "delete", entity: "seo_service", entityId: data._id, before: data.toObject() });
  res.json({ success: true, message: "Service page deleted" });
}

module.exports = {
  listSeoServices,
  getSeoServiceBySlug,
  createSeoService,
  updateSeoService,
  deleteSeoService
};
