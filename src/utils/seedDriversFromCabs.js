"use strict";

const { Cab } = require("../models/Cab");
const { Driver } = require("../models/Driver");
const { normalizeCabForApi } = require("./catalogNormalize");
const { buildDefaultDriverFarePackages } = require("./driverFarePackages");

function driverLanguages(city) {
  const c = String(city || "").toLowerCase();
  if (c.includes("bengaluru") || c.includes("mysore")) return ["Kannada", "English", "Hindi"];
  if (c.includes("hyderabad")) return ["Telugu", "English", "Hindi"];
  return ["Tamil", "English", "Hindi"];
}

function cabToDriverPayload(cab, index) {
  const normalized = normalizeCabForApi(cab);
  const title = normalized.title || normalized.name || "Acting Driver";
  const pricing = {
    hourly: normalized.hourlyRate > 0 ? normalized.hourlyRate : 300,
    day: normalized.dayRate > 0 ? normalized.dayRate : normalized.price > 0 ? normalized.price : 2800,
    extraHour: normalized.extraHourRate > 0 ? normalized.extraHourRate : 220
  };

  const farePackages =
    normalized.farePackages && Object.keys(normalized.farePackages).length
      ? {
          local4hr: normalized.farePackages.local4hr,
          local8hr: normalized.farePackages.local8hr,
          outstationOneWay: normalized.farePackages.outstationOneWay,
          outstationRoundTrip: normalized.farePackages.outstationRoundTrip
        }
      : buildDefaultDriverFarePackages({ pricing, discountPercentage: normalized.discountPercentage });

  return {
    name: title.replace(/\s*—\s*Acting Driver$/i, "").trim(),
    vendor: normalized.vendor || "Cabzii Partner",
    type: String(normalized.type || "").toLowerCase().includes("van") ? "van" : "local",
    experience: "Verified chauffeur",
    trips: 600 + index * 120,
    rating: normalized.rating != null ? String(normalized.rating) : "4.8",
    discountPercentage: normalized.discountPercentage || 0,
    image: normalized.image || "",
    city: normalized.city || "Chennai",
    location: normalized.location || "",
    languages: driverLanguages(normalized.city),
    supportedVehicles: [normalized.type || "Sedan", title].filter(Boolean),
    pricing,
    farePackages,
    seo: `acting driver ${normalized.city}, chauffeur ${title}`,
    seoTitle: `Acting Driver — ${title} | ${normalized.city}`,
    seoDescription: `Hire a verified acting driver for ${title} in ${normalized.city}. Same packages as cab booking on Cabzii.in.`,
    status: "active",
    isDeleted: false
  };
}

/**
 * When the drivers collection is empty but cabs exist, create one acting-driver
 * listing per cab so the homepage and /drivers pages show catalog data.
 */
async function seedDriversFromCabsIfEmpty() {
  const activeDriverFilter = {
    isDeleted: { $ne: true },
    $or: [{ status: "active" }, { status: { $exists: false } }]
  };

  const existing = await Driver.countDocuments(activeDriverFilter);
  if (existing > 0) {
    return { created: 0, skipped: true, reason: "drivers_exist" };
  }

  const cabs = await Cab.find({
    isDeleted: { $ne: true },
    $or: [{ status: "active" }, { status: { $exists: false } }]
  })
    .limit(80)
    .lean();

  if (!cabs.length) {
    return { created: 0, skipped: true, reason: "no_cabs" };
  }

  const docs = cabs.map((cab, index) => cabToDriverPayload(cab, index));
  const inserted = await Driver.insertMany(docs, { ordered: false });
  console.log(`Auto-seeded ${inserted.length} acting drivers from cab catalog.`);
  return { created: inserted.length, skipped: false };
}

module.exports = { seedDriversFromCabsIfEmpty, cabToDriverPayload };
