"use strict";

const ENQUIRY_SOURCES = ["whatsapp_quote", "website_enquiry"];

const STAGE_ALIAS = {
  converted: "confirmed",
  closed: "lost",
  booked: "confirmed"
};

const ALLOWED_STAGES = ["new", "contacted", "quotation_sent", "follow_up", "confirmed", "completed", "lost"];

function isHoneypot(value) {
  return Boolean(String(value?.website || "").trim());
}

function looksAutomated(value) {
  const name = String(value?.name || "");
  const message = String(value?.message || "");
  if (/https?:\/\//i.test(name)) return true;
  if (message.split(/https?:\/\//i).length > 3) return true;
  return false;
}

function shouldDropSpam(value) {
  return isHoneypot(value) || looksAutomated(value);
}

function mapProductType(service) {
  const s = String(service || "").trim().toLowerCase();
  if (["cab", "bus", "driver", "tour", "other"].includes(s)) return s;
  return "cab";
}

function resolveLeadSource(value) {
  const explicit = String(value?.source || "").trim();
  if (ENQUIRY_SOURCES.includes(explicit)) return explicit;
  const cta = String(value?.ctaLocation || "").toLowerCase();
  if (cta.includes("whatsapp") || cta === "otp_login") return "whatsapp_quote";
  return "website_enquiry";
}

function hasMinimumIntent(value) {
  const mobile = String(value?.mobile || "").replace(/\D/g, "");
  if (!/^[6-9]\d{9}$/.test(mobile)) return false;
  const pickup = String(value?.pickup || "").trim();
  const drop = String(value?.drop || "").trim();
  const page = String(value?.sourcePage || value?.landingPage || "").trim();
  const tripType = String(value?.tripType || "").trim();
  return Boolean(pickup || drop || page || tripType);
}

function resolveStage(raw) {
  const aliased = STAGE_ALIAS[String(raw || "").trim()] || String(raw || "").trim();
  return ALLOWED_STAGES.includes(aliased) ? aliased : "";
}

function buildLeadFields(value, owned = {}) {
  const pickup = String(value.pickup || "").trim();
  const drop = String(value.drop || "").trim();
  const source = resolveLeadSource(value);
  return {
    name: String(value.name || "").trim() || (source === "whatsapp_quote" ? "WhatsApp quote" : "Website enquiry"),
    mobile: value.mobile,
    email: String(value.email || "").trim(),
    source,
    productType: mapProductType(value.service),
    vehicleType: value.vehicleName || owned.vehicleName || "",
    boardingPoint: pickup,
    droppingPoint: drop,
    route: [pickup, drop].filter(Boolean).join(" → "),
    sourcePage: String(value.sourcePage || value.landingPage || "").trim(),
    landingPage: String(value.landingPage || value.sourcePage || "").trim(),
    referrer: String(value.referrer || "").trim(),
    ctaLocation: String(value.ctaLocation || "").trim(),
    utmSource: String(value.utmSource || "").trim(),
    utmMedium: String(value.utmMedium || "").trim(),
    utmCampaign: String(value.utmCampaign || "").trim(),
    vehicleId: String(value.vehicleId || "").trim(),
    vehicleName: value.vehicleName || owned.vehicleName || "",
    travelDate: String(value.travelDate || "").trim(),
    pickupTime: String(value.pickupTime || "").trim(),
    passengerCount: String(value.passengerCount || "").trim(),
    estimatedFare: Number(value.estimatedFare) || owned.price || 0,
    distanceKm: Number(value.distanceKm) || 0,
    tripType: String(value.tripType || "").trim(),
    packageLabel: String(value.packageLabel || "").trim(),
    customerMessage: String(value.message || "").trim(),
    vendorAdminPhone: owned.vendorAdminPhone || ""
  };
}

function applyLeadUpdates(lead, fields) {
  const skip = new Set(["source"]);
  for (const [key, next] of Object.entries(fields)) {
    if (skip.has(key)) continue;
    if (next === "" || next == null) continue;
    lead[key] = next;
  }
  if (fields.source === "whatsapp_quote") {
    lead.whatsappSent = true;
    if (!ENQUIRY_SOURCES.includes(lead.source)) lead.source = "whatsapp_quote";
  }
  return lead;
}

module.exports = {
  ENQUIRY_SOURCES,
  STAGE_ALIAS,
  ALLOWED_STAGES,
  isHoneypot,
  looksAutomated,
  shouldDropSpam,
  mapProductType,
  resolveLeadSource,
  hasMinimumIntent,
  resolveStage,
  buildLeadFields,
  applyLeadUpdates
};
