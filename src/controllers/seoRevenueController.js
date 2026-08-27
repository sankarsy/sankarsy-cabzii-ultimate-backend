"use strict";

const Joi = require("joi");
const { SeoEvent } = require("../models/SeoEvent");
const { SeoPageInsight } = require("../models/SeoPageInsight");
const { SearchConsoleSnapshot } = require("../models/SearchConsoleSnapshot");
const { HttpError } = require("../utils/httpError");
const { isSuperAdminUser } = require("../utils/adminAccess");
const { sanitizeSeoEvent } = require("../utils/seoRevenueMath");
const { getSeoRevenueReport, invalidateSeoRevenueCache } = require("../services/seoRevenueReportService");
const { logAudit } = require("../services/auditService");

async function ingestSeoEvent(req, res) {
  const doc = sanitizeSeoEvent(req.body || {});
  if (!doc) throw new HttpError(400, "Invalid SEO event.");
  await SeoEvent.create(doc);
  res.status(201).json({ success: true });
}

async function seoRevenueOverview(req, res) {
  if (!isSuperAdminUser(req)) throw new HttpError(403, "Super admin only.");
  const data = await getSeoRevenueReport(req.query || {});
  res.json({ success: true, data });
}

const insightSchema = Joi.object({
  landingPage: Joi.string().required(),
  pageType: Joi.string().allow("").default(""),
  city: Joi.string().allow("").default(""),
  service: Joi.string().allow("").default(""),
  origin: Joi.string().allow("").default(""),
  destination: Joi.string().allow("").default(""),
  route: Joi.string().allow("").default(""),
  vendorSupplyNote: Joi.string().valid("", "unknown", "low", "adequate", "strong").default("unknown"),
  investFlag: Joi.boolean().default(false),
  recommendation: Joi.string().valid("", "keep", "improve_content", "add_vendors", "review_indexation").default(""),
  notes: Joi.string().allow("").default("")
});

async function listInsights(req, res) {
  if (!isSuperAdminUser(req)) throw new HttpError(403, "Super admin only.");
  const data = await SeoPageInsight.find({}).sort({ updatedAt: -1 }).lean().limit(500);
  res.json({ success: true, data });
}

async function createInsight(req, res) {
  if (!isSuperAdminUser(req)) throw new HttpError(403, "Super admin only.");
  const { error, value } = insightSchema.validate(req.body, { stripUnknown: true });
  if (error) throw new HttpError(400, error.message);
  value.landingPage = String(value.landingPage).split("?")[0];
  const data = await SeoPageInsight.findOneAndUpdate({ landingPage: value.landingPage }, value, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true
  });
  invalidateSeoRevenueCache();
  await logAudit({
    req,
    action: "seo_insight.create",
    entity: "seo-page-insight",
    entityId: data._id,
    after: value
  });
  res.status(201).json({ success: true, data });
}

async function updateInsight(req, res) {
  if (!isSuperAdminUser(req)) throw new HttpError(403, "Super admin only.");
  const { error, value } = insightSchema.validate(req.body, { stripUnknown: true });
  if (error) throw new HttpError(400, error.message);
  if (value.landingPage) value.landingPage = String(value.landingPage).split("?")[0];
  const before = await SeoPageInsight.findById(req.params.id).lean();
  if (!before) throw new HttpError(404, "Insight not found.");
  const data = await SeoPageInsight.findByIdAndUpdate(req.params.id, value, { new: true }).lean();
  invalidateSeoRevenueCache();
  await logAudit({
    req,
    action: "seo_insight.update",
    entity: "seo-page-insight",
    entityId: req.params.id,
    before,
    after: value
  });
  res.json({ success: true, data });
}

async function deleteInsight(req, res) {
  if (!isSuperAdminUser(req)) throw new HttpError(403, "Super admin only.");
  const before = await SeoPageInsight.findById(req.params.id).lean();
  if (!before) throw new HttpError(404, "Insight not found.");
  await SeoPageInsight.findByIdAndDelete(req.params.id);
  invalidateSeoRevenueCache();
  await logAudit({
    req,
    action: "seo_insight.delete",
    entity: "seo-page-insight",
    entityId: req.params.id,
    before
  });
  res.json({ success: true });
}

const gscRowSchema = Joi.object({
  keyword: Joi.string().required(),
  clicks: Joi.number().min(0).default(0),
  impressions: Joi.number().min(0).default(0),
  ctr: Joi.number().min(0).default(0),
  position: Joi.number().min(0).default(0),
  landingPage: Joi.string().allow("").default(""),
  opportunityScore: Joi.number().min(0).max(100).default(0),
  snapshotDate: Joi.string().allow("").default("")
});

async function createGscRow(req, res) {
  if (!isSuperAdminUser(req)) throw new HttpError(403, "Super admin only.");
  const { error, value } = gscRowSchema.validate(req.body, { stripUnknown: true, convert: true });
  if (error) throw new HttpError(400, error.message);
  const data = await SearchConsoleSnapshot.create(value);
  invalidateSeoRevenueCache();
  res.status(201).json({ success: true, data });
}

async function updateGscRow(req, res) {
  if (!isSuperAdminUser(req)) throw new HttpError(403, "Super admin only.");
  const { error, value } = gscRowSchema.validate(req.body, { stripUnknown: true, convert: true });
  if (error) throw new HttpError(400, error.message);
  const data = await SearchConsoleSnapshot.findByIdAndUpdate(req.params.id, value, { new: true }).lean();
  if (!data) throw new HttpError(404, "Snapshot not found.");
  invalidateSeoRevenueCache();
  res.json({ success: true, data });
}

async function deleteGscRow(req, res) {
  if (!isSuperAdminUser(req)) throw new HttpError(403, "Super admin only.");
  const before = await SearchConsoleSnapshot.findById(req.params.id).lean();
  if (!before) throw new HttpError(404, "Snapshot not found.");
  await SearchConsoleSnapshot.findByIdAndDelete(req.params.id);
  invalidateSeoRevenueCache();
  res.json({ success: true });
}

module.exports = {
  ingestSeoEvent,
  seoRevenueOverview,
  listInsights,
  createInsight,
  updateInsight,
  deleteInsight,
  createGscRow,
  updateGscRow,
  deleteGscRow
};
