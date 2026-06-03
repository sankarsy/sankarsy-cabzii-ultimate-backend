"use strict";

const { buildDefaultFarePackages } = require("./cabFarePackages");
const { buildDefaultDriverFarePackages } = require("./driverFarePackages");

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function inferSeats(title = "", type = "") {
  const t = `${title} ${type}`.toLowerCase();
  if (t.includes("tempo") || t.includes("traveller")) return 12;
  if (t.includes("innova") || t.includes("crysta")) return 7;
  if (t.includes("suv") || t.includes("ertiga")) return 6;
  if (t.includes("wagon")) return 4;
  return 4;
}

function inferCity(doc) {
  if (doc.city && String(doc.city).trim()) return String(doc.city).trim();
  const text = `${doc.name || ""} ${doc.title || ""} ${doc.seoTitle || ""}`.toLowerCase();
  if (text.includes("chennai")) return "Chennai";
  if (text.includes("bengaluru") || text.includes("bangalore")) return "Bengaluru";
  if (text.includes("hyderabad")) return "Hyderabad";
  if (text.includes("madurai")) return "Madurai";
  if (text.includes("coimbatore")) return "Coimbatore";
  return "Chennai";
}

/** Legacy DB: package.oneWay / roundTrip with per-km offerPrice + coverage + bata */
function fareFromLegacyPkg(pkg, includedKm) {
  if (!pkg || typeof pkg !== "object") return null;
  const perKm = num(pkg.offerPrice) || num(pkg.price);
  const coverage =
    includedKm !== undefined && includedKm !== null ? num(includedKm) : num(pkg.coverage) || 100;
  const bata = num(pkg.bata);
  const discount = num(pkg.discount);

  if (perKm <= 0 && bata <= 0) return null;

  const originalPrice = Math.max(Math.round(perKm * coverage + bata), bata > 0 ? Math.round(bata * 2) : 0);
  if (originalPrice <= 0) return null;

  const price = discount > 0 ? Math.round(originalPrice * (1 - discount / 100)) : originalPrice;

  return {
    originalPrice,
    price,
    discountPercentage: discount,
    extraKmRate: num(pkg.extraKms) || Math.max(12, perKm),
    extraHourRate: Math.max(100, Math.round(bata / 5) || 150)
  };
}

function isLegacyCab(doc) {
  if (!doc || typeof doc !== "object") return false;
  const hasLegacy = Boolean(doc.package?.oneWay || doc.package?.roundTrip);
  const hasModern =
    num(doc.price) > 0 ||
    num(doc.farePackages?.outstationOneWay?.price) > 0 ||
    num(doc.farePackages?.local4hr?.price) > 0;
  return hasLegacy && !hasModern;
}

function isLegacyDriver(doc) {
  if (!doc || typeof doc !== "object") return false;
  const hasPricing = num(doc.pricing?.hourly) > 0 || num(doc.pricing?.day) > 0;
  const hasPackages = num(doc.farePackages?.local4hr?.price) > 0;
  return !hasPackages && !hasPricing && num(doc.price) <= 0;
}

function normalizeCabForApi(doc) {
  if (!doc) return doc;
  const id = doc._id ?? doc.id;

  if (!isLegacyCab(doc)) {
    const price = num(doc.price);
    const farePackages =
      doc.farePackages && Object.keys(doc.farePackages).length
        ? doc.farePackages
        : price > 0
          ? buildDefaultFarePackages(doc)
          : doc.farePackages;

    return {
      ...doc,
      _id: id,
      id: id ? String(id) : "",
      title: doc.title || doc.name || "Cab",
      vendor: doc.vendor || "Cabzii Partner",
      price,
      farePackages,
      city: doc.city || inferCity(doc),
      image: doc.image || (Array.isArray(doc.cabImages) ? doc.cabImages[0] : "") || ""
    };
  }

  const oneWay = doc.package?.oneWay;
  const roundTrip = doc.package?.roundTrip;
  const local4hr = fareFromLegacyPkg(oneWay, 40);
  const local8hr = fareFromLegacyPkg(oneWay, 80);
  const outstationOneWay = fareFromLegacyPkg(oneWay, num(oneWay?.coverage) || 100);
  const outstationRoundTrip = fareFromLegacyPkg(roundTrip, num(roundTrip?.coverage) || 200);

  const farePackages = {
    local4hr: local4hr || outstationOneWay,
    local8hr: local8hr || outstationOneWay,
    outstationOneWay: outstationOneWay || local8hr,
    outstationRoundTrip: outstationRoundTrip || outstationOneWay
  };

  const price = num(outstationOneWay?.price) || num(local8hr?.price) || 0;
  const originalPrice = num(outstationOneWay?.originalPrice) || price;
  const title = doc.title || doc.name || "Cab";

  return {
    ...doc,
    _id: id,
    id: id ? String(id) : "",
    title,
    name: title,
    vendor: doc.vendor || "Cabzii Partner",
    type: doc.type || "Sedan",
    seats: doc.seats || inferSeats(title, doc.type),
    bags: doc.bags ?? (inferSeats(title, doc.type) >= 6 ? 3 : 2),
    price,
    originalPrice,
    hourlyRate: local4hr ? Math.round(local4hr.price / 4) : 0,
    dayRate: local8hr?.price || 0,
    extraHourRate: num(outstationOneWay?.extraHourRate),
    discountPercentage: num(oneWay?.discount) || num(doc.discountPercentage),
    farePackages,
    city: inferCity(doc),
    image: doc.image || (Array.isArray(doc.cabImages) ? doc.cabImages[0] : "") || "",
    status: doc.status || "active",
    isDeleted: doc.isDeleted === true
  };
}

function normalizeDriverForApi(doc) {
  if (!doc) return doc;
  const id = doc._id ?? doc.id;
  const base = {
    ...doc,
    _id: id,
    id: id ? String(id) : "",
    name: doc.name || doc.serviceTitle || "Acting Driver",
    vendor: doc.vendor || "Cabzii Partner",
    city: doc.city || inferCity(doc),
    status: doc.status || "active"
  };

  if (isLegacyDriver(doc)) {
    const pricing = {
      hourly: num(doc.pricing?.hourly) || 280,
      day: num(doc.pricing?.day) || 2800,
      extraHour: num(doc.pricing?.extraHour) || 220
    };
    return {
      ...base,
      pricing,
      farePackages: buildDefaultDriverFarePackages({ ...base, pricing })
    };
  }

  const farePackages =
    doc.farePackages && Object.keys(doc.farePackages).length
      ? doc.farePackages
      : buildDefaultDriverFarePackages(base);

  return { ...base, farePackages };
}

module.exports = {
  normalizeCabForApi,
  normalizeDriverForApi,
  fareFromLegacyPkg,
  isLegacyCab
};
