"use strict";

const Joi = require("joi");
const { slugify } = require("./slugify");

const mongooseFields = {
  slug: { type: String, trim: true, default: "", index: true },
  productCode: { type: String, trim: true, default: "" },
  brandName: { type: String, trim: true, default: "" },
  imageAlt: { type: String, default: "" },
  imageTitle: { type: String, default: "" },
  countryOfOrigin: { type: String, trim: true, default: "India" },
  speciality: { type: String, trim: true, default: "" },
  condition: { type: String, trim: true, default: "" },
  taxPercent: { type: Number, default: 5, min: 0, max: 100 },
  majorPush: { type: Boolean, default: false },
  minorPush: { type: Boolean, default: false }
};

const enterpriseSeoJoi = Joi.object({
  robots: Joi.string().allow("").default("index,follow"),
  ogTitle: Joi.string().allow("").default(""),
  ogDescription: Joi.string().allow("").default(""),
  ogImage: Joi.string().allow("").default(""),
  twitterTitle: Joi.string().allow("").default(""),
  twitterDescription: Joi.string().allow("").default(""),
  twitterImage: Joi.string().allow("").default(""),
  h1: Joi.string().allow("").default(""),
  h2: Joi.array().items(Joi.string().allow("")).default([]),
  h3: Joi.array().items(Joi.string().allow("")).default([]),
  shortDescription: Joi.string().allow("").default(""),
  longSeoContent: Joi.string().allow("").default(""),
  highlights: Joi.array().items(Joi.string()).default([]),
  state: Joi.string().allow("").default("Tamil Nadu"),
  nearbyLocations: Joi.array().items(Joi.string()).default([]),
  nearbyAirports: Joi.array().items(Joi.string()).default([]),
  nearbyStations: Joi.array().items(Joi.string()).default([]),
  nearbyPlaces: Joi.array().items(Joi.string()).default([]),
  priceUnit: Joi.string().allow("").default("Per KM"),
  offerText: Joi.string().allow("").default(""),
  offerEnds: Joi.string().allow("").default(""),
  youtubeUrl: Joi.string().allow("").default(""),
  seoReviews: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().allow("").default(""),
        rating: Joi.number().min(1).max(5).default(5),
        review: Joi.string().allow("").default(""),
        location: Joi.string().allow("").default("")
      }).unknown(true)
    )
    .default([]),
  relatedVehicles: Joi.array().items(Joi.string()).default([]),
  relatedCities: Joi.array().items(Joi.string()).default([]),
  relatedPackages: Joi.array().items(Joi.string()).default([]),
  relatedBlogs: Joi.array().items(Joi.string()).default([]),
  relatedServices: Joi.array().items(Joi.string()).default([]),
  seoScore: Joi.number().min(0).max(100).default(0)
}).unknown(true).default();

const joiFields = {
  slug: Joi.string().allow("").default(""),
  productCode: Joi.string().allow("").default(""),
  brandName: Joi.string().allow("").default(""),
  imageAlt: Joi.string().allow("").default(""),
  imageTitle: Joi.string().allow("").default(""),
  countryOfOrigin: Joi.string().allow("").default("India"),
  speciality: Joi.string().allow("").default(""),
  condition: Joi.string().allow("").default(""),
  taxPercent: Joi.number().min(0).max(100).default(5),
  majorPush: Joi.boolean().default(false),
  minorPush: Joi.boolean().default(false),
  seo: Joi.string().allow("").default(""),
  seoTitle: Joi.string().allow("").default(""),
  seoDescription: Joi.string().allow("").default(""),
  metaKeywords: Joi.string().allow("").default(""),
  canonicalUrl: Joi.string().allow("").default(""),
  schemaEnabled: Joi.boolean().default(true),
  faq: Joi.array()
    .items(
      Joi.object({
        question: Joi.string().allow("").default(""),
        answer: Joi.string().allow("").default("")
      }).unknown(true)
    )
    .default([]),
  enterpriseSeo: enterpriseSeoJoi
};

const SEO_KEYS = [
  "seo",
  "seoTitle",
  "seoDescription",
  "metaKeywords",
  "canonicalUrl",
  "schemaEnabled",
  "faq",
  "enterpriseSeo",
  ...Object.keys(mongooseFields)
];

function splitCatalogBody(body) {
  const raw = body && typeof body === "object" ? { ...body } : {};
  const extra = {};
  for (const key of SEO_KEYS) {
    if (key in raw) {
      extra[key] = raw[key];
      delete raw[key];
    }
  }
  return { core: raw, product: extra };
}

function buildAutoSlug(title, city = "") {
  return slugify([title, city].filter(Boolean).join("-"));
}

function normalizeCatalogProduct(input = {}, { title = "", vendor = "", type = "", city = "", vehicleModel = "" } = {}) {
  const slug = slugify(input.slug) || buildAutoSlug(title, city);
  const brandName = String(input.brandName || vendor || "").trim();
  const speciality = String(input.speciality || type || "").trim();
  const model = String(vehicleModel || "").trim();
  const imageAlt = String(input.imageAlt || [title, model, "cab rental", city].filter(Boolean).join(" ")).trim();
  const imageTitle = String(input.imageTitle || title || model || "").trim();

  return {
    slug,
    productCode: String(input.productCode || "").trim(),
    brandName,
    imageAlt,
    imageTitle,
    ...(input.metaKeywords != null ? { metaKeywords: String(input.metaKeywords || "") } : {}),
    ...(input.canonicalUrl != null ? { canonicalUrl: String(input.canonicalUrl || "") } : {}),
    ...(input.schemaEnabled != null ? { schemaEnabled: Boolean(input.schemaEnabled) } : {}),
    ...(Array.isArray(input.faq) ? { faq: input.faq } : {}),
    ...(input.enterpriseSeo && typeof input.enterpriseSeo === "object"
      ? { enterpriseSeo: input.enterpriseSeo }
      : {}),
    countryOfOrigin: String(input.countryOfOrigin || "India").trim() || "India",
    speciality,
    condition: String(input.condition || "").trim(),
    taxPercent: Number(input.taxPercent) || 5,
    majorPush: Boolean(input.majorPush),
    minorPush: Boolean(input.minorPush),
    seo: String(input.seo || "").trim(),
    seoTitle: String(input.seoTitle || "").trim(),
    seoDescription: String(input.seoDescription || "").trim()
  };
}

async function ensureUniqueSlug(Model, slug, excludeId) {
  if (!slug) return "";
  let candidate = slug;
  let n = 0;
  while (n < 20) {
    const query = { slug: candidate };
    if (excludeId) query._id = { $ne: excludeId };
    const exists = await Model.findOne(query).select("_id").lean();
    if (!exists) return candidate;
    n += 1;
    candidate = `${slug}-${n}`;
  }
  return `${slug}-${Date.now().toString(36)}`;
}

function catalogLookupQuery(param) {
  const mongoose = require("mongoose");
  if (mongoose.isValidObjectId(param)) return { _id: param };
  return { slug: String(param || "").trim() };
}

module.exports = {
  mongooseFields,
  joiFields,
  splitCatalogBody,
  buildAutoSlug,
  normalizeCatalogProduct,
  ensureUniqueSlug,
  catalogLookupQuery
};
