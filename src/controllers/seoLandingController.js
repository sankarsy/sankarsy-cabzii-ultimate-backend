const Joi = require("joi");
const mongoose = require("mongoose");
const { SeoLanding } = require("../models/SeoLanding");
const { HttpError } = require("../utils/httpError");
const { parseListQuery, paginatedFind } = require("../utils/listQuery");
const { logAudit } = require("../services/auditService");
const { slugify } = require("../utils/slugify");
const { seoLandingPublicPath } = require("../utils/seoPublicPaths");

const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "cabs",
  "drivers",
  "call-driver",
  "call-drivers-chennai",
  "acting-driver",
  "car-rental",
  "cab-booking",
  "services",
  "routes",
  "blogs",
  "blog",
  "holidays",
  "tour-packages",
  "about",
  "contact",
  "faq",
  "login",
  "signin",
  "account",
  "payment",
  "booking",
  "search",
  "tariff",
  "locations",
  "testimonials",
  "pages",
  "track-booking"
]);

const seoLandingSchema = Joi.object({
  slug: Joi.string().allow("").default(""),
  h1: Joi.string().required(),
  intro: Joi.string().allow("").default(""),
  body: Joi.string().allow("").default(""),
  seoTitle: Joi.string().required(),
  seoDescription: Joi.string().allow("").default(""),
  seo: Joi.string().allow("").default(""),
  faqs: Joi.array()
    .items(Joi.object({ question: Joi.string().required(), answer: Joi.string().allow("").default("") }).unknown(true))
    .default([]),
  schemaJson: Joi.string().allow("").default(""),
  ctaHref: Joi.string().allow("").default("/cabs"),
  ctaLabel: Joi.string().allow("").default("Book now"),
  published: Joi.boolean().default(true)
});

function withPublicUrl(doc) {
  if (!doc) return doc;
  const plain = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
  return { ...plain, publicPath: seoLandingPublicPath(plain.slug) };
}

function normalizePayload(value) {
  const h1 = String(value.h1 || "").trim();
  const seoTitle = String(value.seoTitle || h1).trim();
  const slug = slugify(value.slug) || slugify(h1) || slugify(seoTitle);
  if (!slug) throw new HttpError(400, "Add an H1 or slug so the page URL can be created.");
  if (RESERVED_SLUGS.has(slug)) {
    throw new HttpError(400, `“${slug}” is a reserved site path. Use a different slug.`);
  }
  return {
    ...value,
    slug,
    h1,
    seoTitle,
    seoDescription: String(value.seoDescription || "").trim(),
    seo: String(value.seo || "").trim(),
    intro: String(value.intro || "").trim(),
    body: String(value.body || ""),
    ctaHref: String(value.ctaHref || "/cabs").trim() || "/cabs",
    ctaLabel: String(value.ctaLabel || "Book now").trim() || "Book now"
  };
}

async function listSeoLandings(req, res) {
  const pq = parseListQuery(req);
  const isAdmin = req.user && ["super_admin", "vendor_admin"].includes(req.user.role);
  const includeAll = isAdmin && (req.query.admin === "1" || req.query.includeUnpublished === "1");
  const filter = {};
  if (!includeAll) filter.published = true;
  if (req.query.slug) filter.slug = slugify(req.query.slug);
  const { data, meta } = await paginatedFind(SeoLanding, filter, pq, { slug: 1 });
  res.json({ success: true, data: data.map((row) => withPublicUrl(row)), meta });
}

async function getSeoLanding(req, res) {
  const isAdmin = req.user && ["super_admin", "vendor_admin"].includes(req.user.role);
  const { id } = req.params;
  let doc;
  if (mongoose.isValidObjectId(id)) {
    doc = await SeoLanding.findById(id);
  } else {
    const filter = { slug: slugify(id) };
    if (!isAdmin) filter.published = true;
    doc = await SeoLanding.findOne(filter);
  }
  if (!doc) return res.status(404).json({ success: false, message: "SEO page not found" });
  if (!isAdmin && doc.published === false) {
    return res.status(404).json({ success: false, message: "SEO page not found" });
  }
  res.json({ success: true, data: withPublicUrl(doc) });
}

async function createSeoLanding(req, res) {
  const { error, value } = seoLandingSchema.validate(req.body, { stripUnknown: true, convert: true });
  if (error) throw new HttpError(400, error.message);
  const payload = normalizePayload(value);
  const existing = await SeoLanding.findOne({ slug: payload.slug });
  if (existing) throw new HttpError(409, `A page at /pages/${payload.slug} already exists — edit it instead.`);
  const data = await SeoLanding.create(payload);
  await logAudit({ req, action: "create", entity: "seo_landing", entityId: data._id, after: data.toObject() });
  res.status(201).json({ success: true, data: withPublicUrl(data) });
}

async function updateSeoLanding(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, "Invalid id");
  const { error, value } = seoLandingSchema.validate(req.body, { stripUnknown: true, convert: true });
  if (error) throw new HttpError(400, error.message);
  const payload = normalizePayload(value);
  const duplicate = await SeoLanding.findOne({ slug: payload.slug, _id: { $ne: req.params.id } });
  if (duplicate) throw new HttpError(409, `A page at /pages/${payload.slug} already exists.`);
  const data = await SeoLanding.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
  if (!data) throw new HttpError(404, "SEO page not found");
  await logAudit({ req, action: "update", entity: "seo_landing", entityId: data._id, after: data.toObject() });
  res.json({ success: true, data: withPublicUrl(data) });
}

async function deleteSeoLanding(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, "Invalid id");
  const data = await SeoLanding.findByIdAndDelete(req.params.id);
  if (!data) throw new HttpError(404, "SEO page not found");
  await logAudit({ req, action: "delete", entity: "seo_landing", entityId: data._id, before: data.toObject() });
  res.json({ success: true, message: "SEO page deleted", data: withPublicUrl(data) });
}

module.exports = {
  listSeoLandings,
  getSeoLanding,
  createSeoLanding,
  updateSeoLanding,
  deleteSeoLanding
};
