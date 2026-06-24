const Joi = require("joi");
const { SiteSettings } = require("../models/SiteSettings");
const { mergeSiteSettings, deepMerge } = require("../config/siteSettingsDefaults");
const { HttpError } = require("../utils/httpError");
const { logAudit } = require("../services/auditService");

const settingsSchema = Joi.object({
  siteName: Joi.string(),
  brandColor: Joi.string(),
  tagline: Joi.string().allow(""),
  contact: Joi.object({
    email: Joi.string().allow(""),
    phone: Joi.string().allow(""),
    whatsapp: Joi.string().allow(""),
    address: Joi.string().allow(""),
    hours: Joi.string().allow("")
  }),
  navbar: Joi.array().items(
    Joi.object({
      label: Joi.string().required(),
      href: Joi.string().required(),
      visible: Joi.boolean(),
      sortOrder: Joi.number()
    })
  ),
  footerQuickLinks: Joi.array().items(Joi.object({ label: Joi.string().required(), href: Joi.string().required() })),
  footerLegalLinks: Joi.array().items(Joi.object({ label: Joi.string().required(), href: Joi.string().required() })),
  hero: Joi.object(),
  heroStats: Joi.array().items(Joi.object()),
  whySection: Joi.object(),
  whyStats: Joi.array().items(Joi.object()),
  whyChooseUs: Joi.array().items(Joi.object()),
  homeSections: Joi.array().items(Joi.object()),
  whatsappFab: Joi.object(),
  pageSeo: Joi.object().pattern(
    Joi.string(),
    Joi.object({
      productName: Joi.string().allow(""),
      seoTitle: Joi.string().allow(""),
      seoDescription: Joi.string().allow(""),
      seoKeywords: Joi.string().allow("")
    })
  )
}).min(1);

async function getOrCreateSettingsDoc() {
  let doc = await SiteSettings.findOne({ key: "main" });
  if (!doc) {
    doc = await SiteSettings.create({ key: "main" });
  }
  return doc;
}

async function getPublicSettings(req, res) {
  const doc = await getOrCreateSettingsDoc();
  const plain = doc.toObject();
  delete plain.__v;
  res.json({ success: true, data: mergeSiteSettings(plain) });
}

async function updateSettings(req, res) {
  const { error, value } = settingsSchema.validate(req.body, { stripUnknown: true });
  if (error) throw new HttpError(400, error.message);

  const before = await getOrCreateSettingsDoc();
  const beforePlain = before.toObject();
  if (value.pageSeo) {
    value.pageSeo = deepMerge(beforePlain.pageSeo || {}, value.pageSeo);
  }
  const updated = await SiteSettings.findByIdAndUpdate(
    before._id,
    { $set: value },
    { new: true, runValidators: true }
  );
  const data = mergeSiteSettings(updated.toObject());
  await logAudit({
    req,
    action: "update",
    entity: "site_settings",
    entityId: updated._id,
    after: data
  });
  res.json({ success: true, data });
}

module.exports = { getPublicSettings, updateSettings };
