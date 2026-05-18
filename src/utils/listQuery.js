"use strict";

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseFeaturesQuery(raw) {
  if (raw == null) return [];
  const arr = Array.isArray(raw) ? raw : [raw];
  const out = [];
  for (const item of arr) {
    for (const part of String(item).split(",")) {
      const t = part.trim();
      if (t) out.push(t);
    }
  }
  return out;
}

function parseListQuery(req) {
  const q = (req.query?.q ?? "").trim();
  const page = Math.max(1, Number.parseInt(String(req.query?.page ?? "1"), 10) || 1);
  const limitRaw = Number.parseInt(String(req.query?.limit ?? "20"), 10) || 20;
  const limit = Math.min(100, Math.max(1, limitRaw));
  const type = (req.query?.type ?? "").trim();
  const vendor = (req.query?.vendor ?? "").trim();
  const duration = (req.query?.duration ?? "").trim();
  const maxPriceN = Number.parseInt(String(req.query?.maxPrice ?? ""), 10);
  const maxPrice = Number.isFinite(maxPriceN) && maxPriceN > 0 ? maxPriceN : null;
  const features = parseFeaturesQuery(req.query?.features);
  return { q, page, limit, type, vendor, duration, maxPrice, features };
}

function textOrClause(fields, q) {
  if (!q) return null;
  const rx = new RegExp(escapeRegex(q), "i");
  return { $or: fields.map((f) => ({ [f]: rx })) };
}

/**
 * Build { $and: [...] } from optional base filter + text search + exact filters.
 */
function buildCabListFilter(baseFilter, { q, type, maxPrice, features }) {
  const parts = [];
  if (baseFilter && Object.keys(baseFilter).length > 0) parts.push(baseFilter);
  const text = textOrClause(["title", "vendor", "type", "seo", "seoTitle", "seoDescription", "features"], q);
  if (text) parts.push(text);
  if (type) parts.push({ type });
  if (maxPrice) parts.push({ price: { $lte: maxPrice } });
  if (features.length) parts.push({ features: { $all: features } });
  if (parts.length === 0) return {};
  if (parts.length === 1) return parts[0];
  return { $and: parts };
}

function buildPackageListFilter(baseFilter, { q, vendor, duration }) {
  const parts = [];
  if (baseFilter && Object.keys(baseFilter).length > 0) parts.push(baseFilter);
  const text = textOrClause(["name", "vendor", "duration", "seo", "seoTitle", "seoDescription", "tags"], q);
  if (text) parts.push(text);
  if (vendor) parts.push({ vendor });
  if (duration) parts.push({ duration });
  if (parts.length === 0) return {};
  if (parts.length === 1) return parts[0];
  return { $and: parts };
}

function buildDriverListFilter(baseFilter, { q }) {
  const parts = [];
  if (baseFilter && Object.keys(baseFilter).length > 0) parts.push(baseFilter);
  const text = textOrClause(
    ["name", "vendor", "experience", "rating", "seo", "seoTitle", "seoDescription", "languages", "supportedVehicles"],
    q
  );
  if (text) parts.push(text);
  if (parts.length === 0) return {};
  if (parts.length === 1) return parts[0];
  return { $and: parts };
}

async function paginatedFind(Model, filter, { page, limit }, sort = { createdAt: -1 }) {
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    Model.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Model.countDocuments(filter)
  ]);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    data,
    meta: { page, limit, total, totalPages }
  };
}

module.exports = {
  parseListQuery,
  buildCabListFilter,
  buildPackageListFilter,
  buildDriverListFilter,
  paginatedFind
};
