const Joi = require("joi");
const mongoose = require("mongoose");
const { SeoRoute } = require("../models/SeoRoute");
const { HttpError } = require("../utils/httpError");
const { parseListQuery, paginatedFind } = require("../utils/listQuery");
const { logAudit } = require("../services/auditService");
const { slugify } = require("../utils/slugify");
const { ensureUniqueSlug } = require("../utils/catalogProductFields");
const { autoSeoRouteFields } = require("../utils/seoAutoFill");

const seoRouteSchema = Joi.object({
  slug: Joi.string().allow("").default(""),
  title: Joi.string().allow("").default(""),
  fromCitySlug: Joi.string().allow("").default(""),
  toCitySlug: Joi.string().allow("").default(""),
  distance: Joi.string().allow("").default(""),
  duration: Joi.string().allow("").default(""),
  sedanFrom: Joi.number().min(0).default(0),
  suvFrom: Joi.number().min(0).default(0),
  body: Joi.string().allow("").default(""),
  highlights: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string().allow("")).default([]),
  popularStops: Joi.array().items(Joi.string()).default([]),
  faqs: Joi.array()
    .items(Joi.object({ question: Joi.string().required(), answer: Joi.string().allow("").default("") }))
    .default([]),
  images: Joi.array().items(Joi.string()).default([]),
  schemaJson: Joi.string().allow("").default(""),
  seo: Joi.string().allow("").default(""),
  seoTitle: Joi.string().allow("").default(""),
  seoDescription: Joi.string().allow("").default(""),
  published: Joi.boolean().default(true),
  showInMenu: Joi.boolean().default(false),
  menuLabel: Joi.string().allow("").default(""),
  menuSortOrder: Joi.number().default(0)
});

async function normalizePayload(value, excludeId) {
  const highlights = Array.isArray(value.highlights)
    ? value.highlights.map((h) => String(h).trim()).filter(Boolean)
    : String(value.highlights || "")
        .split(",")
        .map((h) => h.trim())
        .filter(Boolean);

  const fromCitySlug = slugify(value.fromCitySlug);
  const toCitySlug = slugify(value.toCitySlug);
  if (!fromCitySlug || !toCitySlug) {
    throw new HttpError(400, "From city and to city are required (e.g. chennai, bengaluru).");
  }

  const auto = autoSeoRouteFields(value);
  const seoTitle = String(value.seoTitle || auto.seoTitle || "").trim();
  const title = String(value.title || auto.title || seoTitle).trim();
  if (!seoTitle && !title) {
    throw new HttpError(400, "SEO title is required.");
  }

  const seo = String(value.seo || auto.seo || "").trim();
  const seoDescription = String(value.seoDescription || auto.seoDescription || "").trim();

  const baseSlug =
    slugify(value.slug) ||
    slugify(`${fromCitySlug}-to-${toCitySlug}-cab`) ||
    slugify(seoTitle) ||
    slugify(title);
  if (!baseSlug) throw new HttpError(400, "Could not generate URL slug.");

  const slug = await ensureUniqueSlug(SeoRoute, baseSlug, excludeId);

  return {
    ...value,
    slug,
    title: title || seoTitle,
    seoTitle: seoTitle || title,
    seo,
    seoDescription,
    fromCitySlug,
    toCitySlug,
    highlights
  };
}

function withPublicUrl(doc) {
  if (!doc) return doc;
  const plain = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
  return {
    ...plain,
    publicPath: `/routes/${plain.slug}`,
    menuHref: `/routes/${plain.slug}`
  };
}

async function listSeoRoutes(req, res) {
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

  const { data, meta } = await paginatedFind(SeoRoute, filter, pq, { menuSortOrder: 1, title: 1 });
  res.json({
    success: true,
    data: data.map((row) => withPublicUrl(row)),
    meta
  });
}

async function getSeoRouteBySlug(req, res) {
  const isAdmin = req.user && ["super_admin", "vendor_admin"].includes(req.user.role);
  const param = req.params.slug;
  let doc;

  if (mongoose.isValidObjectId(param) && isAdmin) {
    doc = await SeoRoute.findById(param);
  } else {
    const filter = isAdmin ? { slug: param } : { slug: param, published: true };
    doc = await SeoRoute.findOne(filter);
  }

  if (!doc) return res.status(404).json({ success: false, message: "Route page not found" });
  res.json({ success: true, data: withPublicUrl(doc) });
}

async function createSeoRoute(req, res) {
  const { error, value } = seoRouteSchema.validate(req.body, { stripUnknown: true, convert: true });
  if (error) throw new HttpError(400, error.message);
  const payload = await normalizePayload(value);
  const data = await SeoRoute.create(payload);
  await logAudit({ req, action: "create", entity: "seo_route", entityId: data._id, after: data.toObject() });
  res.status(201).json({ success: true, data: withPublicUrl(data) });
}

async function updateSeoRoute(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, "Invalid id");
  const { error, value } = seoRouteSchema.validate(req.body, { stripUnknown: true, convert: true });
  if (error) throw new HttpError(400, error.message);
  const payload = await normalizePayload(value, req.params.id);
  const data = await SeoRoute.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
  if (!data) throw new HttpError(404, "Route page not found");
  await logAudit({ req, action: "update", entity: "seo_route", entityId: data._id, after: data.toObject() });
  res.json({ success: true, data: withPublicUrl(data) });
}

async function deleteSeoRoute(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, "Invalid id");
  const data = await SeoRoute.findByIdAndDelete(req.params.id);
  if (!data) throw new HttpError(404, "Route page not found");
  await logAudit({ req, action: "delete", entity: "seo_route", entityId: data._id, before: data.toObject() });
  res.json({ success: true, message: "Route page deleted" });
}

module.exports = {
  listSeoRoutes,
  getSeoRouteBySlug,
  createSeoRoute,
  updateSeoRoute,
  deleteSeoRoute
};
