const Joi = require("joi");
const mongoose = require("mongoose");
const { SeoCityPage } = require("../models/SeoCityPage");
const { HttpError } = require("../utils/httpError");
const { parseListQuery, paginatedFind } = require("../utils/listQuery");
const { logAudit } = require("../services/auditService");
const { slugify } = require("../utils/slugify");

const seoCityPageSchema = Joi.object({
  pageType: Joi.string().valid("cab-booking", "acting-driver").required(),
  citySlug: Joi.string().required(),
  seoTitle: Joi.string().required(),
  seoDescription: Joi.string().allow("").default(""),
  seo: Joi.string().allow("").default(""),
  h1: Joi.string().allow("").default(""),
  body: Joi.string().allow("").default(""),
  published: Joi.boolean().default(true)
});

function normalizePayload(value) {
  return {
    ...value,
    citySlug: slugify(value.citySlug),
    seoTitle: String(value.seoTitle || "").trim(),
    seoDescription: String(value.seoDescription || "").trim(),
    seo: String(value.seo || "").trim()
  };
}

function withPublicUrl(doc) {
  if (!doc) return doc;
  const plain = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
  return { ...plain, publicPath: `/${plain.pageType}/${plain.citySlug}` };
}

async function listSeoCityPages(req, res) {
  const pq = parseListQuery(req);
  const isAdmin = req.user && ["super_admin", "vendor_admin"].includes(req.user.role);
  const includeAll = isAdmin && (req.query.admin === "1" || req.query.includeUnpublished === "1");

  const filter = {};
  if (!includeAll) filter.published = true;
  if (req.query.pageType) filter.pageType = req.query.pageType;
  if (req.query.citySlug) filter.citySlug = slugify(req.query.citySlug);

  const { data, meta } = await paginatedFind(SeoCityPage, filter, pq, { pageType: 1, citySlug: 1 });
  res.json({ success: true, data: data.map((row) => withPublicUrl(row)), meta });
}

/** GET /:pageType/:citySlug — public single lookup (also accepts Mongo id as :pageType for admin) */
async function getSeoCityPage(req, res) {
  const isAdmin = req.user && ["super_admin", "vendor_admin"].includes(req.user.role);
  const { pageType, citySlug } = req.params;

  let doc;
  if (!citySlug && mongoose.isValidObjectId(pageType) && isAdmin) {
    doc = await SeoCityPage.findById(pageType);
  } else {
    const filter = { pageType, citySlug: slugify(citySlug || "") };
    if (!isAdmin) filter.published = true;
    doc = await SeoCityPage.findOne(filter);
  }

  if (!doc) return res.status(404).json({ success: false, message: "City page not found" });
  res.json({ success: true, data: withPublicUrl(doc) });
}

async function createSeoCityPage(req, res) {
  const { error, value } = seoCityPageSchema.validate(req.body, { stripUnknown: true, convert: true });
  if (error) throw new HttpError(400, error.message);
  const payload = normalizePayload(value);

  const existing = await SeoCityPage.findOne({ pageType: payload.pageType, citySlug: payload.citySlug });
  if (existing) {
    throw new HttpError(409, `A ${payload.pageType} page for "${payload.citySlug}" already exists — edit it instead.`);
  }

  const data = await SeoCityPage.create(payload);
  await logAudit({ req, action: "create", entity: "seo_city_page", entityId: data._id, after: data.toObject() });
  res.status(201).json({ success: true, data: withPublicUrl(data) });
}

async function updateSeoCityPage(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, "Invalid id");
  const { error, value } = seoCityPageSchema.validate(req.body, { stripUnknown: true, convert: true });
  if (error) throw new HttpError(400, error.message);
  const payload = normalizePayload(value);

  const duplicate = await SeoCityPage.findOne({
    pageType: payload.pageType,
    citySlug: payload.citySlug,
    _id: { $ne: req.params.id }
  });
  if (duplicate) {
    throw new HttpError(409, `A ${payload.pageType} page for "${payload.citySlug}" already exists.`);
  }

  const data = await SeoCityPage.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
  if (!data) throw new HttpError(404, "City page not found");
  await logAudit({ req, action: "update", entity: "seo_city_page", entityId: data._id, after: data.toObject() });
  res.json({ success: true, data: withPublicUrl(data) });
}

async function deleteSeoCityPage(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, "Invalid id");
  const data = await SeoCityPage.findByIdAndDelete(req.params.id);
  if (!data) throw new HttpError(404, "City page not found");
  await logAudit({ req, action: "delete", entity: "seo_city_page", entityId: data._id, before: data.toObject() });
  res.json({ success: true, message: "City page deleted" });
}

module.exports = {
  listSeoCityPages,
  getSeoCityPage,
  createSeoCityPage,
  updateSeoCityPage,
  deleteSeoCityPage
};
