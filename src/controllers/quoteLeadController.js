"use strict";

const Joi = require("joi");
const mongoose = require("mongoose");
const { CrmLead } = require("../models/CrmLead");
const { Cab } = require("../models/Cab");
const { HttpError } = require("../utils/httpError");
const { parseListQuery, paginatedFind } = require("../utils/listQuery");
const { isSuperAdminUser } = require("../utils/adminAccess");
const { isVendorAdmin } = require("../utils/vendorBookingAccess");
const { makeQuoteRef } = require("../utils/vendorOnboarding");
const { normalizeMobileNumber } = require("../utils/mobile");
const { buildQuoteText, publicQuotePayload } = require("../utils/quotePackage");
const { buildQuotePdfBuffer } = require("../utils/quotePdf");

const quoteSchema = Joi.object({
  mobile: Joi.string().pattern(/^[6-9]\d{9}$/).required(),
  name: Joi.string().allow("").default(""),
  service: Joi.string().allow("").default("cab"),
  vehicleId: Joi.string().allow("").default(""),
  vehicleName: Joi.string().allow("").default(""),
  pickup: Joi.string().allow("").default(""),
  drop: Joi.string().allow("").default(""),
  travelDate: Joi.string().allow("").default(""),
  pickupTime: Joi.string().allow("").default(""),
  passengerCount: Joi.string().allow("").default(""),
  estimatedFare: Joi.number().min(0).default(0),
  distanceKm: Joi.number().min(0).default(0),
  tripType: Joi.string().allow("").default(""),
  packageLabel: Joi.string().allow("").default(""),
  sourcePage: Joi.string().allow("").default(""),
  ctaLocation: Joi.string().allow("").default(""),
  utmSource: Joi.string().allow("").default(""),
  utmMedium: Joi.string().allow("").default(""),
  utmCampaign: Joi.string().allow("").default("")
});

function leadFilterForUser(req) {
  if (isSuperAdminUser(req)) return {};
  if (isVendorAdmin(req)) {
    const mobile = normalizeMobileNumber(req.user.mobileNumber);
    return { vendorAdminPhone: mobile };
  }
  throw new HttpError(403, "Admin only.");
}

function siteOrigin(req) {
  const proto = String(req.headers["x-forwarded-proto"] || req.protocol || "https").split(",")[0].trim();
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "cabzii.in").split(",")[0].trim();
  return `${proto}://${host}`;
}

function quoteUrls(req, quoteRef) {
  const origin = siteOrigin(req);
  return {
    viewUrl: `${origin}/quote/${quoteRef}`,
    pdfUrl: `${origin}/api/quote-leads/public/${quoteRef}/pdf`
  };
}

function quoteResponse(req, lead) {
  const payload = publicQuotePayload(lead);
  const urls = quoteUrls(req, lead.quoteRef);
  return {
    quoteRef: lead.quoteRef,
    id: lead._id,
    ...urls,
    text: buildQuoteText(payload, urls),
    trip: payload
  };
}

async function stampVendorFromVehicle(vehicleId) {
  const id = String(vehicleId || "").trim();
  if (!id) return { vendorAdminPhone: "", vehicleName: "", price: 0 };
  const or = [{ slug: id }];
  if (mongoose.isValidObjectId(id)) or.push({ _id: id });
  const cab = await Cab.findOne({ $or: or }).select("vendorAdminPhone title vehicleName price startingPrice").lean();
  if (!cab) return { vendorAdminPhone: "", vehicleName: "", price: 0 };
  return {
    vendorAdminPhone: String(cab.vendorAdminPhone || "").trim(),
    vehicleName: cab.vehicleName || cab.title || "",
    price: Number(cab.startingPrice || cab.price || 0)
  };
}

async function createPublicQuoteLead(req, res) {
  const { error, value } = quoteSchema.validate(req.body, { stripUnknown: true, convert: true });
  if (error) throw new HttpError(400, error.message);
  const owned = await stampVendorFromVehicle(value.vehicleId);
  const quoteRef = makeQuoteRef();
  const productType = ["cab", "bus", "driver", "tour", "other"].includes(value.service) ? value.service : "cab";
  const data = await CrmLead.create({
    name: value.name.trim() || "WhatsApp quote",
    mobile: value.mobile,
    source: "whatsapp_quote",
    stage: "new",
    productType,
    vehicleType: value.vehicleName || owned.vehicleName,
    boardingPoint: value.pickup,
    droppingPoint: value.drop,
    route: [value.pickup, value.drop].filter(Boolean).join(" → "),
    whatsappSent: true,
    quoteRef,
    sourcePage: value.sourcePage,
    ctaLocation: value.ctaLocation || "otp_login",
    utmSource: value.utmSource,
    utmMedium: value.utmMedium,
    utmCampaign: value.utmCampaign,
    vehicleId: value.vehicleId,
    vehicleName: value.vehicleName || owned.vehicleName,
    travelDate: value.travelDate,
    pickupTime: value.pickupTime,
    passengerCount: value.passengerCount,
    estimatedFare: Number(value.estimatedFare) || owned.price || 0,
    distanceKm: Number(value.distanceKm) || 0,
    tripType: value.tripType,
    packageLabel: value.packageLabel,
    vendorAdminPhone: owned.vendorAdminPhone
  });
  res.status(201).json({
    success: true,
    data: quoteResponse(req, data)
  });
}

async function findPublicQuote(quoteRef) {
  const ref = String(quoteRef || "").trim();
  if (!ref) throw new HttpError(400, "Quote reference required.");
  const lead = await CrmLead.findOne({ quoteRef: ref, source: "whatsapp_quote" }).lean();
  if (!lead) throw new HttpError(404, "Quote not found.");
  return lead;
}

async function getPublicQuote(req, res) {
  const lead = await findPublicQuote(req.params.quoteRef);
  res.json({ success: true, data: quoteResponse(req, lead) });
}

async function getPublicQuotePdf(req, res) {
  const lead = await findPublicQuote(req.params.quoteRef);
  const buf = buildQuotePdfBuffer(publicQuotePayload(lead));
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="cabzii-quote-${lead.quoteRef}.pdf"`);
  res.send(buf);
}

async function listQuoteLeads(req, res) {
  const scope = leadFilterForUser(req);
  const pq = parseListQuery(req);
  const filter = { ...scope, source: "whatsapp_quote" };
  if (req.query.status) filter.stage = req.query.status;
  if (req.query.service) filter.productType = req.query.service;
  if (req.query.vehicle) {
    filter.$or = [
      { vehicleName: new RegExp(String(req.query.vehicle), "i") },
      { vehicleType: new RegExp(String(req.query.vehicle), "i") }
    ];
  }
  if (req.query.source) filter.utmSource = req.query.source;
  const from = String(req.query.from || "").trim();
  const to = String(req.query.to || "").trim();
  if (from || to) {
    filter.createdAt = {};
    if (from) {
      const start = new Date(from);
      if (!Number.isNaN(start.getTime())) filter.createdAt.$gte = start;
    }
    if (to) {
      const end = new Date(to);
      if (!Number.isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }
    if (!Object.keys(filter.createdAt).length) delete filter.createdAt;
  }
  const { data, meta } = await paginatedFind(CrmLead, filter, pq, { createdAt: -1 });
  res.json({ success: true, data, meta });
}

async function updateQuoteLeadStage(req, res) {
  const scope = leadFilterForUser(req);
  const stage = String(req.body?.stage || "").trim();
  const allowed = ["new", "contacted", "quotation_sent", "confirmed", "lost"];
  if (!allowed.includes(stage)) throw new HttpError(400, "Invalid status.");
  const data = await CrmLead.findOneAndUpdate({ _id: req.params.id, ...scope }, { stage }, { new: true });
  if (!data) throw new HttpError(404, "Lead not found");
  res.json({ success: true, data });
}

module.exports = {
  createPublicQuoteLead,
  getPublicQuote,
  getPublicQuotePdf,
  listQuoteLeads,
  updateQuoteLeadStage
};
