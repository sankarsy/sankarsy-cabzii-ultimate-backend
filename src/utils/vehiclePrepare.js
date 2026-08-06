"use strict";

const Joi = require("joi");
const { Cab } = require("../models/Cab");
const { HttpError } = require("../utils/httpError");
const {
  splitCatalogBody,
  normalizeCatalogProduct,
  ensureUniqueSlug,
  catalogLookupQuery,
  buildAutoSlug,
  joiFields: catalogJoiFields
} = require("../utils/catalogProductFields");
const { mergeFarePackages, resolveFarePackages } = require("../utils/cabFarePackages");
const { syncVehiclePricing, normalizePackageRow } = require("../utils/vehiclePackages");
const { nextProductCode, applyVehicleSeo } = require("../utils/vehicleSeo");
const { normalizeCatalogMediaFields } = require("../utils/mediaPath");

const packageFareSchema = Joi.object({
  originalPrice: Joi.number().min(0).default(0),
  price: Joi.number().min(0).default(0),
  discountPercentage: Joi.number().min(0).max(100).default(0),
  extraKmRate: Joi.number().min(0).default(0),
  extraHourRate: Joi.number().min(0).default(0)
});

const vehiclePackageSchema = Joi.object({
  packageType: Joi.string().default("custom"),
  packageName: Joi.string().allow("").default(""),
  includedHours: Joi.number().min(0).default(0),
  includedKm: Joi.number().min(0).default(0),
  originalPrice: Joi.number().min(0).default(0),
  price: Joi.number().min(0).default(0),
  discountPercentage: Joi.number().min(0).max(100).default(0),
  extraKmRate: Joi.number().min(0).default(0),
  extraHourRate: Joi.number().min(0).default(0),
  sortOrder: Joi.number().default(0),
  active: Joi.boolean().default(true)
});

const vehicleImageSchema = Joi.object({
  url: Joi.string().required(),
  type: Joi.string().default("gallery"),
  alt: Joi.string().allow("").default(""),
  title: Joi.string().allow("").default(""),
  caption: Joi.string().allow("").default(""),
  sortOrder: Joi.number().default(0)
});

const vehicleFaqSchema = Joi.object({
  question: Joi.string().allow("").default(""),
  answer: Joi.string().allow("").default("")
});

const vehicleSeoReviewSchema = Joi.object({
  name: Joi.string().allow("").default(""),
  rating: Joi.number().min(1).max(5).default(5),
  review: Joi.string().allow("").default(""),
  location: Joi.string().allow("").default("")
});

const enterpriseSeoSchema = Joi.object({
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
  seoReviews: Joi.array().items(vehicleSeoReviewSchema).default([]),
  relatedVehicles: Joi.array().items(Joi.string()).default([]),
  relatedCities: Joi.array().items(Joi.string()).default([]),
  relatedPackages: Joi.array().items(Joi.string()).default([]),
  relatedBlogs: Joi.array().items(Joi.string()).default([]),
  relatedServices: Joi.array().items(Joi.string()).default([]),
  seoScore: Joi.number().min(0).max(100).default(0)
}).default();

const cabCoreSchema = Joi.object({
  title: Joi.string().required(),
  vendor: Joi.string().required(),
  type: Joi.string().required(),
  category: Joi.string().allow("").default(""),
  vehicleModel: Joi.string().allow("").default(""),
  vehicleName: Joi.string().allow("").default(""),
  brand: Joi.string().allow("").default(""),
  model: Joi.string().allow("").default(""),
  variant: Joi.string().allow("").default(""),
  year: Joi.number().integer().min(1990).max(2035).optional(),
  serviceForm: Joi.string().allow("").default("One Way"),
  pickupLocations: Joi.array().items(Joi.string()).default([]),
  featured: Joi.boolean().default(false),
  recommended: Joi.boolean().default(false),
  bestseller: Joi.boolean().default(false),
  seats: Joi.number().integer().min(1).required(),
  bags: Joi.number().integer().min(0).max(10).default(2),
  doors: Joi.number().integer().min(2).max(6).default(4),
  examples: Joi.string().allow("").default(""),
  fuelType: Joi.string().allow("").default("Petrol"),
  transmission: Joi.string().allow("").default("Manual"),
  mileage: Joi.string().allow("").default(""),
  engine: Joi.string().allow("").default(""),
  ac: Joi.boolean().default(true),
  airCondition: Joi.boolean().default(true),
  gps: Joi.boolean().default(false),
  fastTag: Joi.boolean().default(false),
  musicSystem: Joi.boolean().default(true),
  charger: Joi.boolean().default(false),
  bottledWater: Joi.boolean().default(false),
  childSeat: Joi.boolean().default(false),
  wheelchairAccessible: Joi.boolean().default(false),
  price: Joi.number().min(0).required(),
  startingPrice: Joi.number().min(0).default(0),
  pricePerKm: Joi.number().min(0).default(0),
  pricePerHour: Joi.number().min(0).default(0),
  currency: Joi.string().default("INR"),
  hourlyRate: Joi.number().min(0).default(0),
  dayRate: Joi.number().min(0).default(0),
  extraHourRate: Joi.number().min(0).default(0),
  originalPrice: Joi.number().min(0).default(0),
  discountPercentage: Joi.number().min(0).max(100).default(0),
  rating: Joi.number().min(0).max(5).optional(),
  reviewCount: Joi.number().min(0).default(0),
  image: Joi.string().allow("").default(""),
  gallery: Joi.array().items(Joi.string()).default([]),
  images: Joi.array().items(vehicleImageSchema).default([]),
  city: Joi.string().required(),
  location: Joi.string().allow("").default(""),
  features: Joi.array().items(Joi.string()).default([]),
  packages: Joi.array().items(vehiclePackageSchema).default([]),
  farePackages: Joi.object({
    local4hr: packageFareSchema,
    local8hr: packageFareSchema,
    outstationOneWay: packageFareSchema,
    outstationRoundTrip: packageFareSchema
  }).optional(),
  farePackageLabels: Joi.object().unknown(true).optional(),
  metaKeywords: Joi.string().allow("").default(""),
  canonicalUrl: Joi.string().allow("").default(""),
  schemaEnabled: Joi.boolean().default(true),
  faq: Joi.array().items(vehicleFaqSchema).default([]),
  breadcrumb: Joi.string().allow("").default(""),
  enterpriseSeo: enterpriseSeoSchema,
  status: Joi.string().valid("active", "inactive").default("active")
}).concat(Joi.object(catalogJoiFields));

async function ensureUniqueProductCode(code, excludeId) {
  if (!code) return "";
  let candidate = code;
  let n = 0;
  while (n < 20) {
    const query = { productCode: candidate };
    if (excludeId) query._id = { $ne: excludeId };
    const exists = await Cab.findOne(query).select("_id").lean();
    if (!exists) return candidate;
    n += 1;
    const base = code.replace(/-\d+$/, "");
    candidate = `${base}-${n}`;
  }
  return `${code}-${Date.now().toString(36)}`;
}

async function mergeCabProductFields(product, core, existingId) {
  const vehicleName = String(core.vehicleName || core.vehicleModel || core.title || "").trim();
  const normalized = normalizeCatalogProduct(product, {
    title: core.title,
    vendor: core.vendor,
    type: core.type || core.category,
    city: core.city,
    vehicleModel: core.vehicleModel || vehicleName
  });
  if (!normalized.slug) {
    normalized.slug = buildAutoSlug(vehicleName || core.title, core.city);
  }
  normalized.slug = await ensureUniqueSlug(Cab, normalized.slug, existingId);
  if (normalized.productCode) {
    normalized.productCode = await ensureUniqueProductCode(normalized.productCode, existingId);
  }
  return normalized;
}

function mergeFarePackageLabels(existing, incoming) {
  if (!incoming || typeof incoming !== "object") return existing || {};
  return { ...(existing || {}), ...incoming };
}

function prepareVehicleBody(value, existing = {}) {
  const merged = {
    ...existing,
    ...value,
    vehicleName: String(value.vehicleName || value.vehicleModel || value.title || existing.vehicleName || "").trim(),
    category: String(value.category || value.type || existing.category || existing.type || "").trim(),
    type: String(value.type || value.category || existing.type || "").trim()
  };

  if (Array.isArray(value.packages) && value.packages.length) {
    merged.packages = value.packages.map((p, i) => normalizePackageRow(p, i));
  }

  const synced = syncVehiclePricing(merged);
  merged.packages = synced.packages;
  merged.farePackages = synced.farePackages;
  merged.farePackageLabels = mergeFarePackageLabels(existing.farePackageLabels, synced.farePackageLabels);
  merged.startingPrice = synced.startingPrice || merged.price;
  merged.pricePerKm = synced.pricePerKm || merged.pricePerKm;

  if (!merged.price && merged.startingPrice) merged.price = merged.startingPrice;

  const seo = applyVehicleSeo(merged);
  if (!merged.seoTitle) merged.seoTitle = seo.seoTitle;
  if (!merged.seoDescription) merged.seoDescription = seo.seoDescription;
  if (!merged.seo) merged.seo = seo.seo;
  if (!merged.metaKeywords) merged.metaKeywords = seo.metaKeywords;

  if (Array.isArray(merged.images) && merged.images.length) {
    const cover = merged.images.find((img) => img.type === "cover") || merged.images[0];
    if (cover?.url) {
      merged.image = cover.url;
      if (cover.alt) merged.imageAlt = cover.alt;
      if (cover.title) merged.imageTitle = cover.title;
    }
    merged.gallery = merged.images.map((img) => img.url).filter(Boolean);
  }

  // Cover image drives OG + Twitter so admin image changes update social previews automatically.
  if (merged.image) {
    const es =
      merged.enterpriseSeo && typeof merged.enterpriseSeo === "object" ? { ...merged.enterpriseSeo } : {};
    es.ogImage = merged.image;
    es.twitterImage = merged.image;
    merged.enterpriseSeo = es;
  }

  const weakAlt = !merged.imageAlt || /^(image|photo|picture|img|car|cab image)$/i.test(String(merged.imageAlt).trim());
  if (merged.image && weakAlt) {
    const name = merged.vehicleName || merged.vehicleModel || merged.title || merged.name || "Cab";
    const city = merged.city || "India";
    merged.imageAlt = `${name} cab rental for airport and outstation travel in ${city}`;
  }
  if (merged.image && !merged.imageTitle) {
    merged.imageTitle = merged.vehicleName || merged.title || merged.name || merged.imageAlt || "";
  }

  return merged;
}

async function finalizeCabPayload(value, existing = {}, existingId) {
  const { core, product } = splitCatalogBody(value);
  const { error, value: validated } = cabCoreSchema.validate(
    { ...core, ...product },
    { stripUnknown: true, convert: true, abortEarly: false }
  );
  if (error) {
    throw new HttpError(400, error.details.map((d) => d.message).join("; "));
  }

  const productFields = await mergeCabProductFields(product, validated, existingId);
  let payload = prepareVehicleBody(validated, existing);
  payload = { ...payload, ...productFields };

  if (!payload.productCode) {
    payload.productCode = existing.productCode || (await nextProductCode(Cab));
  }
  payload.productCode = await ensureUniqueProductCode(payload.productCode, existingId);
  if (!payload.cabId) payload.cabId = payload.productCode || payload.slug || "";

  return normalizeCatalogMediaFields(payload);
}

module.exports = {
  cabCoreSchema,
  mergeCabProductFields,
  prepareVehicleBody,
  finalizeCabPayload,
  ensureUniqueProductCode
};
