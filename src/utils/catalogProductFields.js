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
  seoDescription: Joi.string().allow("").default("")
};

const SEO_KEYS = ["seo", "seoTitle", "seoDescription", ...Object.keys(mongooseFields)];

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

function normalizeCatalogProduct(input = {}, { title = "", vendor = "", type = "", city = "" } = {}) {
  const slug = slugify(input.slug) || buildAutoSlug(title, city);
  const brandName = String(input.brandName || vendor || "").trim();
  const speciality = String(input.speciality || type || "").trim();
  const imageAlt = String(input.imageAlt || title || "").trim();
  const imageTitle = String(input.imageTitle || title || "").trim();

  return {
    slug,
    productCode: String(input.productCode || "").trim(),
    brandName,
    imageAlt,
    imageTitle,
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
