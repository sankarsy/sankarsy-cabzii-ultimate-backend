"use strict";

/**
 * Generate SEO slugs for cabs, drivers, and packages missing slug.
 * Usage: node scripts/backfillCatalogSlugs.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const path = require("path");
const { Cab } = require(path.join(__dirname, "..", "src", "models", "Cab"));
const { Driver } = require(path.join(__dirname, "..", "src", "models", "Driver"));
const { Package } = require(path.join(__dirname, "..", "src", "models", "Package"));
const {
  normalizeCatalogProduct,
  ensureUniqueSlug
} = require(path.join(__dirname, "..", "src", "utils", "catalogProductFields"));

async function backfillModel(Model, label, titleKey, extra = {}) {
  const rows = await Model.find({ $or: [{ slug: "" }, { slug: { $exists: false } }] });
  let updated = 0;
  for (const row of rows) {
    const doc = row.toObject();
    const product = normalizeCatalogProduct({}, {
      title: doc[titleKey] || doc.title || doc.name || "",
      vendor: doc.vendor || "",
      type: doc.type || doc.category || extra.typeFallback || "",
      city: doc.city || ""
    });
    product.slug = await ensureUniqueSlug(Model, product.slug, row._id);
    if (!product.slug) continue;
    await Model.updateOne({ _id: row._id }, { $set: { slug: product.slug } });
    updated += 1;
    console.log(`  ${label}: ${product.slug}`);
  }
  console.log(`${label}: ${updated} slug(s) backfilled`);
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Missing MONGODB_URI");
    process.exit(1);
  }
  await mongoose.connect(uri);
  console.log("Connected — backfilling catalog slugs…");
  await backfillModel(Cab, "Cabs", "title");
  await backfillModel(Driver, "Drivers", "name");
  await backfillModel(Package, "Packages", "name", { typeFallback: "package" });
  await mongoose.disconnect();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
