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
const {
  ENQUIRY_SOURCES,
  shouldDropSpam,
  hasMinimumIntent,
  resolveStage,
  buildLeadFields,
  applyLeadUpdates
} = require("../utils/quoteLeadEnquiry");

const quoteSchema = Joi.object({
  enquiryId: Joi.string().allow("").default(""),
  mobile: Joi.string().pattern(/^[6-9]\d{9}$/).required(),
  name: Joi.string().allow("").default(""),
  email: Joi.string().allow("").default(""),
  message: Joi.string().allow("").max(2000).default(""),
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
  source: Joi.string().allow("").default(""),
  sourcePage: Joi.string().allow("").default(""),
  landingPage: Joi.string().allow("").default(""),
  referrer: Joi.string().allow("").default(""),
  ctaLocation: Joi.string().allow("").default(""),
  utmSource: Joi.string().allow("").default(""),
  utmMedium: Joi.string().allow("").default(""),
  utmCampaign: Joi.string().allow("").default(""),
  website: Joi.string().allow("").default("")
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
    enquiryId: lead._id,
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
  if (shouldDropSpam(value)) {
    return res.status(201).json({
      success: true,
      data: { enquiryId: "ok", id: "ok", quoteRef: "" }
    });
  }
  if (!hasMinimumIntent(value)) {
    throw new HttpError(400, "Enter a valid mobile number and pickup or trip details.");
  }

  const owned = await stampVendorFromVehicle(value.vehicleId);
  const fields = buildLeadFields(value, owned);

  let lead = null;
  const existingId = String(value.enquiryId || "").trim();
  if (existingId && mongoose.isValidObjectId(existingId)) {
    lead = await CrmLead.findOne({ _id: existingId, source: { $in: ENQUIRY_SOURCES } });
  }

  let created = false;
  if (lead) {
    applyLeadUpdates(lead, fields);
    await lead.save();
  } else {
    lead = await CrmLead.create({
      ...fields,
      stage: "new",
      whatsappSent: fields.source === "whatsapp_quote",
      quoteRef: makeQuoteRef()
    });
    created = true;
  }

  res.status(created ? 201 : 200).json({
    success: true,
    data: quoteResponse(req, lead)
  });
}

async function findPublicQuote(quoteRef) {
  const ref = String(quoteRef || "").trim();
  if (!ref) throw new HttpError(400, "Quote reference required.");
  const lead = await CrmLead.findOne({ quoteRef: ref, source: { $in: ENQUIRY_SOURCES } }).lean();
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
  const filter = { ...scope, source: { $in: ENQUIRY_SOURCES } };
  if (req.query.status) filter.stage = resolveStage(req.query.status) || req.query.status;
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
  const stage = resolveStage(req.body?.stage || req.body?.status);
  if (!stage) throw new HttpError(400, "Invalid status.");
  const patch = { stage };
  if (req.body?.name) patch.name = String(req.body.name).trim();
  if (req.body?.mobile) patch.mobile = String(req.body.mobile).trim();
  if (req.body?.email != null) patch.email = String(req.body.email).trim();
  const data = await CrmLead.findOneAndUpdate({ _id: req.params.id, ...scope, source: { $in: ENQUIRY_SOURCES } }, patch, { new: true });
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
