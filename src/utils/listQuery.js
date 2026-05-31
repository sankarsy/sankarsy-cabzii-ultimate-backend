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
  const city = (req.query?.city ?? "").trim();
  const priorityCity = (req.query?.priorityCity ?? city).trim();
  const duration = (req.query?.duration ?? "").trim();
  const category = (req.query?.category ?? "").trim();
  const maxPriceN = Number.parseInt(String(req.query?.maxPrice ?? ""), 10);
  const maxPrice = Number.isFinite(maxPriceN) && maxPriceN > 0 ? maxPriceN : null;
  const features = parseFeaturesQuery(req.query?.features);
  return { q, page, limit, type, vendor, city, priorityCity, duration, category, maxPrice, features };
}

function cityPriorityScore(doc, city) {
  if (!city) return 1;
  const rx = new RegExp(escapeRegex(city), "i");
  const fields = ["city", "location", "vendor", "name", "title", "type"];
  for (const f of fields) {
    if (doc[f] && rx.test(String(doc[f]))) return 0;
  }
  if (Array.isArray(doc.tags) && doc.tags.some((t) => rx.test(String(t)))) return 0;
  if (Array.isArray(doc.features) && doc.features.some((t) => rx.test(String(t)))) return 0;
  return 1;
}

function sortDocsByCityPriority(docs, priorityCity, sort = { createdAt: -1 }) {
  if (!priorityCity) return docs;
  const sortKey = Object.keys(sort)[0] || "createdAt";
  const sortDir = sort[sortKey] === -1 ? -1 : 1;
  return [...docs].sort((a, b) => {
    const rank = cityPriorityScore(a, priorityCity) - cityPriorityScore(b, priorityCity);
    if (rank !== 0) return rank;
    const av = a[sortKey];
    const bv = b[sortKey];
    if (av === bv) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return av > bv ? -sortDir : sortDir;
  });
}

function textOrClause(fields, q) {
  if (!q) return null;
  const rx = new RegExp(escapeRegex(q), "i");
  return { $or: fields.map((f) => ({ [f]: rx })) };
}

/**
 * Build { $and: [...] } from optional base filter + text search + exact filters.
 */
function cityNameClause(city) {
  if (!city) return null;
  return { city: new RegExp(escapeRegex(city), "i") };
}

function buildCabListFilter(baseFilter, { q, type, city, maxPrice, features }) {
  const parts = [];
  if (baseFilter && Object.keys(baseFilter).length > 0) parts.push(baseFilter);
  const text = textOrClause(["title", "vendor", "type", "city", "location", "seo", "seoTitle", "seoDescription", "features"], q);
  if (text) parts.push(text);
  if (type) parts.push({ type });
  const cityClause = cityNameClause(city);
  if (cityClause) parts.push(cityClause);
  if (maxPrice) parts.push({ price: { $lte: maxPrice } });
  if (features.length) parts.push({ features: { $all: features } });
  if (parts.length === 0) return {};
  if (parts.length === 1) return parts[0];
  return { $and: parts };
}

function buildPackageListFilter(baseFilter, { q, vendor, city, duration, category }) {
  const parts = [];
  if (baseFilter && Object.keys(baseFilter).length > 0) parts.push(baseFilter);
  const text = textOrClause(
    ["name", "vendor", "city", "location", "duration", "seo", "seoTitle", "seoDescription", "tags", "category"],
    q
  );
  if (text) parts.push(text);
  if (vendor) parts.push({ vendor });
  const cityClause = cityNameClause(city);
  if (cityClause) parts.push(cityClause);
  if (duration) parts.push({ duration });
  if (category) parts.push({ category });
  if (parts.length === 0) return {};
  if (parts.length === 1) return parts[0];
  return { $and: parts };
}

function buildDriverListFilter(baseFilter, { q, city, type }) {
  const parts = [];
  if (baseFilter && Object.keys(baseFilter).length > 0) parts.push(baseFilter);
  const text = textOrClause(
    ["name", "vendor", "city", "location", "experience", "rating", "seo", "seoTitle", "seoDescription", "languages", "supportedVehicles", "type"],
    q
  );
  if (text) parts.push(text);
  const cityClause = cityNameClause(city);
  if (cityClause) parts.push(cityClause);
  if (type) parts.push({ type: new RegExp(escapeRegex(type), "i") });
  if (parts.length === 0) return {};
  if (parts.length === 1) return parts[0];
  return { $and: parts };
}

function activeCatalogFilter(base = {}) {
  const activeClause = {
    isDeleted: { $ne: true },
    $or: [{ status: "active" }, { status: { $exists: false } }]
  };
  if (!base || Object.keys(base).length === 0) return activeClause;
  return { $and: [base, activeClause] };
}

async function paginatedFind(Model, filter, { page, limit, priorityCity }, sort = { createdAt: -1 }) {
  const skip = (page - 1) * limit;
  if (!priorityCity) {
    const [data, total] = await Promise.all([
      Model.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Model.countDocuments(filter)
    ]);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    return { data, meta: { page, limit, total, totalPages } };
  }

  const [all, total] = await Promise.all([Model.find(filter).lean(), Model.countDocuments(filter)]);
  const ranked = sortDocsByCityPriority(all, priorityCity, sort);
  const data = ranked.slice(skip, skip + limit);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return { data, meta: { page, limit, total, totalPages, priorityCity } };
}

module.exports = {
  parseListQuery,
  buildCabListFilter,
  buildPackageListFilter,
  buildDriverListFilter,
  paginatedFind,
  activeCatalogFilter,
  sortDocsByCityPriority
};
