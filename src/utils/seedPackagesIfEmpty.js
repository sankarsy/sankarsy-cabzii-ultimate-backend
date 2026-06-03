"use strict";

const path = require("path");
const { Package } = require("../models/Package");

const { packages: SAMPLE_PACKAGES } = require(path.join(__dirname, "../../scripts/contentData"));

function omitId(doc) {
  const { id, ...rest } = doc;
  return { ...rest, status: "active", isDeleted: false };
}

/**
 * Insert default holiday/tour packages when the collection is empty.
 */
async function seedPackagesIfEmpty() {
  const activeFilter = {
    isDeleted: { $ne: true },
    $or: [{ status: "active" }, { status: { $exists: false } }]
  };

  const existing = await Package.countDocuments(activeFilter);
  if (existing > 0) {
    return { created: 0, skipped: true, reason: "packages_exist" };
  }

  if (!Array.isArray(SAMPLE_PACKAGES) || !SAMPLE_PACKAGES.length) {
    return { created: 0, skipped: true, reason: "no_sample_data" };
  }

  const docs = SAMPLE_PACKAGES.map(omitId);
  const inserted = await Package.insertMany(docs, { ordered: false });
  console.log(`Auto-seeded ${inserted.length} holiday packages.`);
  return { created: inserted.length, skipped: false };
}

module.exports = { seedPackagesIfEmpty };
