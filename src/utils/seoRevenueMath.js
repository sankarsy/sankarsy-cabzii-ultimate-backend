"use strict";

const ATTRIBUTION_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const ATTRIBUTION_WINDOW_LABEL = "7 days from recorded seo_page_view (viewedAt) to booking create";

const PAGE_TYPES = new Set([
  "service",
  "route",
  "city-hub",
  "acting-driver",
  "call-driver",
  "tariff",
  "holidays",
  "tour",
  "other"
]);

function unavailable(reason) {
  return { available: false, label: "DATA UNAVAILABLE", reason: reason || "" };
}

function numericAvailable(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return unavailable("not a number");
  return { available: true, value: n };
}

function rateOrNA(numerator, denominator) {
  const n = Number(numerator);
  const d = Number(denominator);
  if (!Number.isFinite(n) || !Number.isFinite(d) || d <= 0) {
    return { available: false, label: "N/A" };
  }
  return { available: true, value: n / d, percent: Math.round((n / d) * 10000) / 100 };
}

function bookingFareGmv(doc = {}) {
  const finalAmount = Number(doc.finalAmount);
  if (Number.isFinite(finalAmount) && finalAmount > 0) return finalAmount;
  const amount = Number(doc.amount);
  return Number.isFinite(amount) ? amount : 0;
}

function isCompletedBooking(doc = {}) {
  return doc.status === "confirmed" || doc.status === "finished";
}

function isSeoInScopeType(type) {
  return type === "cab" || type === "driver" || type === "tour";
}

function parsePeriod(query = {}, now = new Date()) {
  const end = query.to ? new Date(query.to) : new Date(now);
  end.setHours(23, 59, 59, 999);
  let start;
  if (query.from) {
    start = new Date(query.from);
    start.setHours(0, 0, 0, 0);
  } else {
    const days = Math.min(90, Math.max(1, Number(query.days) || 30));
    start = new Date(end);
    start.setDate(start.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);
  }
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    const fallbackEnd = new Date(now);
    fallbackEnd.setHours(23, 59, 59, 999);
    const fallbackStart = new Date(fallbackEnd);
    fallbackStart.setDate(fallbackStart.getDate() - 29);
    fallbackStart.setHours(0, 0, 0, 0);
    return { start: fallbackStart, end: fallbackEnd, label: "Last 30 days", days: 30 };
  }
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const days = Math.max(1, Math.round((endDay - startDay) / 86400000) + 1);
  const preset = Number(query.days);
  const label =
    query.from || query.to
      ? `${start.toISOString().slice(0, 10)} → ${end.toISOString().slice(0, 10)}`
      : preset === 7
        ? "Last 7 days"
        : preset === 90
          ? "Last 90 days"
          : "Last 30 days";
  return { start, end, label, days };
}

function sanitizeAttribution(input = {}, now = new Date()) {
  const landingPage = String(input.landingPage || "").split("?")[0].trim();
  if (!landingPage.startsWith("/") || landingPage.startsWith("//") || landingPage.length > 200) {
    return null;
  }
  const viewedAt = input.viewedAt ? new Date(input.viewedAt) : null;
  if (!viewedAt || Number.isNaN(viewedAt.getTime())) return null;
  if (now.getTime() - viewedAt.getTime() > ATTRIBUTION_WINDOW_MS) return null;
  if (viewedAt.getTime() > now.getTime() + 60 * 1000) return null;
  const pageType = PAGE_TYPES.has(String(input.pageType || "")) ? input.pageType : "other";
  return {
    landingPage,
    pageType,
    city: String(input.city || "").slice(0, 60),
    service: String(input.service || "").slice(0, 60),
    origin: String(input.origin || "").slice(0, 60),
    destination: String(input.destination || "").slice(0, 60),
    route: String(input.route || "").slice(0, 80),
    sessionId: String(input.sessionId || "").slice(0, 80),
    viewedAt,
    attributedAt: now,
    windowHours: 168
  };
}

function sanitizeSeoEvent(input = {}) {
  const eventName = String(input.eventName || "");
  if (!["seo_page_view", "booking_started", "booking_completed"].includes(eventName)) return null;
  const landingPage = String(input.landingPage || "").split("?")[0].trim();
  if (!landingPage.startsWith("/") || landingPage.startsWith("//") || landingPage.length > 200) return null;
  return {
    eventName,
    landingPage,
    pageType: String(input.pageType || "").slice(0, 40),
    city: String(input.city || "").slice(0, 60),
    service: String(input.service || "").slice(0, 60),
    origin: String(input.origin || "").slice(0, 60),
    destination: String(input.destination || "").slice(0, 60),
    route: String(input.route || "").slice(0, 80),
    sessionId: String(input.sessionId || "").slice(0, 80),
    viewedAt: input.viewedAt ? new Date(input.viewedAt) : null
  };
}

const CITY_DIRECTORY = [
  ["chennai", "Chennai"],
  ["coimbatore", "Coimbatore"],
  ["madurai", "Madurai"],
  ["trichy", "Trichy"],
  ["tiruchirappalli", "Trichy"],
  ["salem", "Salem"],
  ["vellore", "Vellore"],
  ["bengaluru", "Bengaluru"],
  ["bangalore", "Bengaluru"],
  ["hyderabad", "Hyderabad"],
  ["kochi", "Kochi"],
  ["mysore", "Mysore"],
  ["pondicherry", "Pondicherry"],
  ["puducherry", "Pondicherry"],
  ["tirupati", "Tirupati"],
  ["ooty", "Ooty"],
  ["kanchipuram", "Kanchipuram"],
  ["tiruvannamalai", "Tiruvannamalai"],
  ["rameswaram", "Rameswaram"],
  ["kanyakumari", "Kanyakumari"],
  ["thanjavur", "Thanjavur"]
];

function inferCitySlug(text = "") {
  const hay = String(text || "").toLowerCase();
  if (!hay) return "";
  for (const [slug, name] of CITY_DIRECTORY) {
    if (hay.includes(name.toLowerCase()) || hay.includes(slug)) return slug === "bangalore" ? "bengaluru" : slug === "puducherry" ? "pondicherry" : slug === "tiruchirappalli" ? "trichy" : slug;
  }
  return "";
}

function operationalServiceKey(booking = {}) {
  if (booking.type === "driver") return "acting-driver";
  if (booking.type === "tour") return "tours";
  const trip = String(booking.serviceTripType || booking.tripType || "").toLowerCase();
  if (trip.includes("airport")) return "airport-taxi";
  if (trip.includes("hourly") || trip.includes("local")) return "hourly-rental";
  if (trip.includes("outstation") && booking.roundTrip) return "outstation-cab";
  if (trip.includes("outstation") || trip.includes("one")) return "one-way-cab";
  return "cab-booking";
}

function recommendNoindex({ impressions, clicks, completedBookings, gmv }) {
  const hasGsc = impressions != null || clicks != null;
  const hasBookings = Number(completedBookings) > 0 || Number(gmv) > 0;
  if (!hasGsc && !hasBookings) {
    return "KEEP NOINDEX";
  }
  if (Number(clicks) >= 20 || Number(completedBookings) >= 3) {
    return "REVIEW FOR REINDEX";
  }
  return "KEEP NOINDEX";
}

function recommendVendors({ completedBookings, activeCabListings, gscImpressionsAvailable }) {
  const bookings = Number(completedBookings) || 0;
  const cabs = Number(activeCabListings) || 0;
  if (bookings >= 5 && cabs <= 1) return "ADD VENDORS";
  if (bookings >= 3 && cabs === 0) return "ADD VENDORS";
  if (!gscImpressionsAvailable && bookings < 3) return "INSUFFICIENT SIGNAL";
  return "WATCH";
}

module.exports = {
  ATTRIBUTION_WINDOW_MS,
  ATTRIBUTION_WINDOW_LABEL,
  unavailable,
  numericAvailable,
  rateOrNA,
  bookingFareGmv,
  isCompletedBooking,
  isSeoInScopeType,
  parsePeriod,
  sanitizeAttribution,
  sanitizeSeoEvent,
  inferCitySlug,
  operationalServiceKey,
  recommendNoindex,
  recommendVendors,
  CITY_DIRECTORY
};
