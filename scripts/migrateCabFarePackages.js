"use strict";

/**
 * Backfill farePackages on existing cabs (local 4hr/40km, 8hr/80km, outstation one-way & round-trip).
 * Usage: node scripts/migrateCabFarePackages.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const path = require("path");
const { Cab } = require(path.join(__dirname, "..", "src", "models", "Cab"));
const { buildDefaultFarePackages } = require(path.join(__dirname, "..", "src", "utils", "cabFarePackages"));
const { normalizeCabForApi, isLegacyCab } = require(path.join(__dirname, "..", "src", "utils", "catalogNormalize"));

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Missing MONGODB_URI");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  const cabs = await Cab.find({});
  let updated = 0;

  for (const cab of cabs) {
    const doc = cab.toObject();
    const existing = doc.farePackages || {};
    const needsUpdate =
      isLegacyCab(doc) || !existing.local4hr?.price || !existing.local8hr?.price || num(doc.price) < 100;

    if (!needsUpdate) continue;

    const normalized = normalizeCabForApi(doc);
    const farePackages = normalized.farePackages || buildDefaultFarePackages(normalized);
    await Cab.updateOne(
      { _id: cab._id },
      {
        $set: {
          title: normalized.title,
          vendor: normalized.vendor,
          price: normalized.price,
          originalPrice: normalized.originalPrice,
          hourlyRate: normalized.hourlyRate,
          dayRate: normalized.dayRate,
          extraHourRate: normalized.extraHourRate,
          discountPercentage: normalized.discountPercentage,
          farePackages,
          city: normalized.city,
          seats: normalized.seats,
          status: "active"
        },
        $unset: { package: "" }
      }
    );
    updated += 1;
    console.log(`Updated: ${normalized.title} — ₹${normalized.price} (${cab._id})`);
  }

  console.log(`Done. Updated ${updated} of ${cabs.length} cabs.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
