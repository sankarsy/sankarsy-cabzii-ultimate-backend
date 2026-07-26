const Joi = require("joi");
const mongoose = require("mongoose");
const { Cab } = require("../models/Cab");
const { HttpError } = require("../utils/httpError");
const { logAudit } = require("../services/auditService");
const { docMatchForVendor, listFilterForVendor, vendorNameForUser } = require("../utils/vendorAccess");
const { catalogLookupQuery } = require("../utils/catalogProductFields");
const { mergeFarePackages } = require("../utils/cabFarePackages");
const {
  parseListQuery,
  buildCabListFilter,
  paginatedFind,
  catalogListFilter,
  isCatalogAdmin,
  cabSortClause
} = require("../utils/listQuery");
const { normalizeCabForApi } = require("../utils/catalogNormalize");
const { finalizeCabPayload } = require("../utils/vehiclePrepare");

async function listCabs(req, res) {
  const base = catalogListFilter(req, listFilterForVendor(req));
  const pq = parseListQuery(req);
  const filter = buildCabListFilter(base, pq);
  const sort = cabSortClause(pq.sort);
  const { data, meta } = await paginatedFind(Cab, filter, pq, sort);
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
  if (isPublic) {
    await Cab.updateOne({ _id: data._id }, { $inc: { "stats.views": 1 } }).catch(() => {});
  }
  res.json({ success: true, data: normalizeCabForApi(data) });
}

async function createCab(req, res) {
  const payload = await finalizeCabPayload(req.body, {}, null);
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
  res.status(201).json({ success: true, data: normalizeCabForApi(data.toObject()) });
}

async function updateCab(req, res) {
  const lookup = catalogLookupQuery(req.params.id);
  const scope = listFilterForVendor(req);
  const match = lookup._id ? { _id: lookup._id, ...scope } : { slug: lookup.slug, ...scope };
  const existing = await Cab.findOne(match).lean();
  if (!existing) throw new HttpError(404, "Cab not found");

  const body = { ...req.body };
  if (body.farePackages) {
    body.farePackages = mergeFarePackages(existing.farePackages, body.farePackages);
  }

  const payload = await finalizeCabPayload(body, existing, existing._id);
  if (req.user?.role === "vendor_admin") {
    payload.vendorAdminPhone = req.user.mobileNumber;
    payload.vendor = vendorNameForUser(req.user) || payload.vendor;
  }
  const data = await Cab.findOneAndUpdate(match, { $set: payload }, { new: true, runValidators: true });
  if (!data) throw new HttpError(404, "Cab not found");
  await logAudit({
    req,
    action: "update",
    entity: "cab",
    entityId: data._id,
    vendor: data.vendor,
    after: data.toObject()
  });
  res.json({ success: true, data: normalizeCabForApi(data.toObject()) });
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

async function duplicateCab(req, res) {
  const filter = docMatchForVendor(req, req.params.id);
  const source = await Cab.findOne(filter).lean();
  if (!source) throw new HttpError(404, "Cab not found");

  const clone = { ...source };
  delete clone._id;
  delete clone.createdAt;
  delete clone.updatedAt;
  clone.title = `${clone.title} (Copy)`;
  clone.slug = "";
  clone.productCode = "";
  clone.stats = {
    rating: clone.stats?.rating || clone.rating || 0,
    totalReviews: 0,
    completedTrips: 0,
    totalBookings: 0,
    views: 0,
    wishlistCount: 0,
    lastBooked: null
  };
  clone.status = "inactive";

  const payload = await finalizeCabPayload(clone, {}, null);
  if (req.user?.role === "vendor_admin") {
    payload.vendorAdminPhone = req.user.mobileNumber;
    payload.vendor = vendorNameForUser(req.user) || payload.vendor;
  }
  const data = await Cab.create(payload);
  await logAudit({
    req,
    action: "duplicate",
    entity: "cab",
    entityId: data._id,
    vendor: data.vendor,
    after: data.toObject()
  });
  res.status(201).json({ success: true, data: normalizeCabForApi(data.toObject()) });
}

async function listCurated(req, res, field) {
  const base = catalogListFilter(req, listFilterForVendor(req));
  const limit = Math.min(50, Math.max(1, Number.parseInt(String(req.query?.limit ?? "12"), 10) || 12));
  const city = (req.query?.city ?? "").trim();
  const pq = {
    q: "",
    featured: field === "featured",
    recommended: field === "recommended",
    bestseller: field === "bestseller",
    city,
    type: "",
    vendor: "",
    brand: "",
    category: "",
    seats: null,
    fuelType: "",
    transmission: "",
    status: "",
    maxPrice: null,
    features: []
  };
  let filter = buildCabListFilter(base, pq);

  if (field === "popular") {
    const popularClause = {
      $or: [{ bestseller: true }, { featured: true }, { "stats.totalBookings": { $gt: 0 } }]
    };
    filter = filter && Object.keys(filter).length ? { $and: [filter, popularClause] } : { ...base, ...popularClause };
  }

  const sort =
    field === "popular"
      ? { "stats.totalBookings": -1, "stats.completedTrips": -1, rating: -1 }
      : { createdAt: -1 };

  const data = await Cab.find(filter).sort(sort).limit(limit).lean();
  res.json({ success: true, data: data.map(normalizeCabForApi) });
}

async function getFeaturedCabs(req, res) {
  return listCurated(req, res, "featured");
}

async function getRecommendedCabs(req, res) {
  return listCurated(req, res, "recommended");
}

async function getPopularCabs(req, res) {
  return listCurated(req, res, "popular");
}

async function getRelatedCabs(req, res) {
  const param = req.params.id;
  const lookup = catalogLookupQuery(param);
  const scope = listFilterForVendor(req);
  const match = lookup._id ? { _id: lookup._id, ...scope } : { slug: lookup.slug, ...scope };
  const source = await Cab.findOne(match).lean();
  if (!source) throw new HttpError(404, "Cab not found");

  const limit = Math.min(12, Math.max(1, Number.parseInt(String(req.query?.limit ?? "6"), 10) || 6));
  const base = catalogListFilter(req, listFilterForVendor(req));
  const or = [];
  if (source.category || source.type) or.push({ category: source.category || source.type });
  if (source.type) or.push({ type: source.type });
  if (source.city) or.push({ city: source.city });
  if (source.brand) or.push({ brand: source.brand });

  const filter = {
    $and: [
      base,
      { _id: { $ne: source._id } },
      or.length ? { $or: or } : {}
    ].filter((c) => Object.keys(c).length)
  };

  const data = await Cab.find(filter).sort({ "stats.totalBookings": -1, rating: -1 }).limit(limit).lean();
  res.json({ success: true, data: data.map(normalizeCabForApi) });
}

module.exports = {
  listCabs,
  getCabById,
  createCab,
  updateCab,
  deleteCab,
  duplicateCab,
  getFeaturedCabs,
  getRecommendedCabs,
  getPopularCabs,
  getRelatedCabs
};
