"use strict";

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function buildVehicleMetaTitle(doc = {}) {
  if (doc.seoTitle && String(doc.seoTitle).trim()) return String(doc.seoTitle).trim();
  const name = doc.vehicleName || doc.vehicleModel || doc.title || "Cab";
  const city = doc.city || "Chennai";
  const perKm = num(doc.pricePerKm);
  const suffix = perKm > 0 ? `₹${perKm} Per KM` : doc.startingPrice ? `From ₹${num(doc.startingPrice).toLocaleString("en-IN")}` : "Cab Booking";
  return `${name} Taxi Rental in ${city} | ${suffix} | Cabzii`;
}

function buildVehicleMetaDescription(doc = {}) {
  if (doc.seoDescription && String(doc.seoDescription).trim()) return String(doc.seoDescription).trim();
  const name = doc.vehicleName || doc.vehicleModel || doc.title || "Cab";
  const city = doc.city || "Chennai";
  const perKm = num(doc.pricePerKm);
  const rate = perKm > 0 ? `starting from ₹${perKm} per km` : `affordable packages from ₹${num(doc.startingPrice || doc.price).toLocaleString("en-IN")}`;
  return `Book ${name} Taxi Rental in ${city} ${rate}. Local packages, airport transfers and outstation cab booking with verified drivers on Cabzii.`;
}

function buildVehicleKeywords(doc = {}) {
  if (doc.metaKeywords && String(doc.metaKeywords).trim()) {
    return String(doc.metaKeywords)
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
  }
  if (doc.seo && String(doc.seo).trim()) {
    return String(doc.seo)
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
  }
  const name = (doc.vehicleName || doc.vehicleModel || doc.title || "cab").toLowerCase();
  const city = (doc.city || "chennai").toLowerCase();
  return [
    `${name} taxi ${city}`,
    `${name} cab rental ${city}`,
    `cab booking ${city}`,
    `${doc.category || doc.type || "sedan"} taxi ${city}`,
    "outstation cab",
    "airport taxi"
  ];
}

async function nextProductCode(Cab) {
  const docs = await Cab.find({ productCode: /^CAB\d+$/i })
    .select("productCode")
    .lean();
  let max = 0;
  for (const d of docs) {
    const m = String(d.productCode || "").match(/CAB(\d+)/i);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `CAB${String(max + 1).padStart(6, "0")}`;
}

function applyVehicleSeo(doc = {}, { generateCode = false, productCode = "" } = {}) {
  const seoTitle = buildVehicleMetaTitle(doc);
  const seoDescription = buildVehicleMetaDescription(doc);
  const keywords = buildVehicleKeywords(doc);
  return {
    seoTitle,
    seoDescription,
    seo: keywords.join(", "),
    metaKeywords: Array.isArray(doc.metaKeywords) ? doc.metaKeywords.join(", ") : doc.metaKeywords || keywords.join(", "),
    canonicalUrl: doc.canonicalUrl || "",
    schemaEnabled: doc.schemaEnabled !== false,
    productCode: doc.productCode || productCode || ""
  };
}

module.exports = {
  buildVehicleMetaTitle,
  buildVehicleMetaDescription,
  buildVehicleKeywords,
  nextProductCode,
  applyVehicleSeo
};
