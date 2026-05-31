"use strict";

/**
 * Backfill farePackages and farePackageLabels on existing drivers.
 * Derives package prices from pricing.hourly / pricing.day when missing.
 *
 * Usage: node scripts/migrateDriverFarePackages.js
 *        npm run migrate:driver-packages
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const path = require("path");
const { Driver } = require(path.join(__dirname, "..", "src", "models", "Driver"));
const {
  DRIVER_PACKAGE_KEYS,
  buildDefaultDriverFarePackages,
  hasStoredDriverPackages,
  mergeDriverFarePackages
} = require(path.join(__dirname, "..", "src", "utils", "driverFarePackages"));

const DEFAULT_DRIVER_LABELS = {
  local4hr: "Local — 4 Hrs / 40 Km",
  local8hr: "Local — 8 Hrs / 80 Km",
  outstationOneWay: "Outstation — One Way",
  outstationRoundTrip: "Outstation — Round Trip"
};

function needsLegacyKeySync(packages) {
  if (!packages || typeof packages !== "object") return false;
  const hasLocalDay =
    Number(packages.localDay?.price) > 0 || Number(packages.localDay?.originalPrice) > 0;
  const hasLocal8 =
    Number(packages.local8hr?.price) > 0 || Number(packages.local8hr?.originalPrice) > 0;
  const has12hr =
    Number(packages.outstation12hr?.price) > 0 || Number(packages.outstation12hr?.originalPrice) > 0;
  const hasRound =
    Number(packages.outstationRoundTrip?.price) > 0 ||
    Number(packages.outstationRoundTrip?.originalPrice) > 0;
  return (hasLocalDay && !hasLocal8) || (has12hr && !hasRound);
}

function needsLabelUpdate(labels) {
  if (!labels || typeof labels !== "object") return true;
  return DRIVER_PACKAGE_KEYS.some((key) => !String(labels[key] || "").trim());
}

function buildDefaultLabels(existing) {
  const out = { ...(existing || {}) };
  for (const key of DRIVER_PACKAGE_KEYS) {
    if (!String(out[key] || "").trim()) {
      out[key] = DEFAULT_DRIVER_LABELS[key];
    }
  }
  return out;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Missing MONGODB_URI");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  const drivers = await Driver.find({});
  let updatedPackages = 0;
  let updatedLabels = 0;

  for (const driver of drivers) {
    const doc = driver.toObject();
    const existingPackages = doc.farePackages || {};
    const existingLabels = doc.farePackageLabels || {};
    const patch = {};

    if (!hasStoredDriverPackages(existingPackages)) {
      patch.farePackages = buildDefaultDriverFarePackages(doc);
      updatedPackages += 1;
    } else if (needsLegacyKeySync(existingPackages)) {
      patch.farePackages = mergeDriverFarePackages(existingPackages, existingPackages);
      updatedPackages += 1;
    }

    if (needsLabelUpdate(existingLabels)) {
      patch.farePackageLabels = buildDefaultLabels(existingLabels);
      updatedLabels += 1;
    }

    if (!Object.keys(patch).length) continue;

    await Driver.updateOne({ _id: driver._id }, { $set: patch });
    const parts = [];
    if (patch.farePackages) parts.push("packages");
    if (patch.farePackageLabels) parts.push("labels");
    console.log(`Updated ${parts.join(" + ")}: ${doc.name} (${driver._id})`);
  }

  console.log(
    `Done. ${drivers.length} drivers scanned — packages: ${updatedPackages}, labels: ${updatedLabels}.`
  );
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
