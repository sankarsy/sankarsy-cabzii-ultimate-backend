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
  hasStoredDriverPackages
} = require(path.join(__dirname, "..", "src", "utils", "driverFarePackages"));

const DEFAULT_DRIVER_LABELS = {
  local4hr: "Local — 4 Hours",
  localDay: "Local — 1 Day",
  outstation12hr: "Outstation — 12 Hours",
  outstationOneWay: "Outstation — One Way"
};

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
