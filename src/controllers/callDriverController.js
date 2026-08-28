const Joi = require("joi");
const { SiteSettings } = require("../models/SiteSettings");
const { mergeSiteSettings } = require("../config/siteSettingsDefaults");
const { publicCallDriverServices, CALL_DRIVER_SERVICE_TYPES } = require("../config/callDriverTariff");
const { quoteCallDriver } = require("../utils/callDriverFare");
const { HttpError } = require("../utils/httpError");

const quoteSchema = Joi.object({
  serviceType: Joi.string()
    .valid(...CALL_DRIVER_SERVICE_TYPES)
    .required(),
  vehicleType: Joi.string().valid("standard", "premium").allow("").optional(),
  vehicleModel: Joi.string().allow("").optional(),
  hours: Joi.number().min(0).allow(null).optional(),
  days: Joi.number().min(0).allow(null).optional(),
  estimatedKm: Joi.number().min(0).allow(null).optional(),
  distanceKm: Joi.number().min(0).allow(null).optional(),
  pickupTime: Joi.string().allow("").optional(),
  driversRequired: Joi.number().min(0).allow(null).optional(),
  driverCount: Joi.number().min(0).allow(null).optional()
}).unknown(true);

async function loadMergedSettings() {
  const doc = await SiteSettings.findOne({ key: "main" }).lean();
  return mergeSiteSettings(doc || {});
}

async function listCallDriverServices(req, res) {
  const settings = await loadMergedSettings();
  const tariff = settings.callDriverTariff || {};
  res.json({
    success: true,
    data: {
      services: publicCallDriverServices(tariff),
      tariff,
      seo: settings.callDriverSeo && typeof settings.callDriverSeo === "object" ? settings.callDriverSeo : {},
      headline: "Need a professional driver for your own car?",
      subhead: "Choose the Call Driver service you need. Cabzii assigns a professional driver after you book."
    }
  });
}

async function quoteCallDriverService(req, res) {
  const { error, value } = quoteSchema.validate(req.body || {}, { stripUnknown: false, convert: true });
  if (error) throw new HttpError(400, error.message);
  const settings = await loadMergedSettings();
  const quote = quoteCallDriver(settings.callDriverTariff, value);
  res.json({ success: true, data: quote });
}

module.exports = { listCallDriverServices, quoteCallDriverService };
