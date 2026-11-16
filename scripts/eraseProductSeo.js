"use strict";

/**
 * Remove product-level SEO fields from cabs, drivers, buses and leftover packages.
 * Page SEO (city / service / route / landing / site settings) is left in place.
 *
 * Usage: node scripts/eraseProductSeo.js
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const { connectDb } = require("../src/config/db");
const { SiteSettings } = require("../src/models/SiteSettings");
const { SeoPageInsight } = require("../src/models/SeoPageInsight");

const PRODUCT_SEO_UNSET = {
  seo: 1,
  seoTitle: 1,
  seoDescription: 1,
  metaKeywords: 1,
  canonicalUrl: 1,
  schemaEnabled: 1,
  breadcrumb: 1,
  faq: 1,
  enterpriseSeo: 1,
  longSeoContent: 1,
  ogTitle: 1,
  ogDescription: 1,
  ogImage: 1,
  twitterTitle: 1,
  twitterDescription: 1,
  twitterImage: 1
};

function isProductSeoPath(href) {
  const p = String(href || "").split("?")[0].replace(/\/+$/, "") || "/";
  if (/^\/cabs\/(?!passenger$|results$)[^/]+$/.test(p)) return true;
  if (/^\/drivers\/(?!passenger$|results$)[^/]+$/.test(p)) return true;
  if (/^\/buses\/[^/]+$/.test(p)) return true;
  if (/^\/packages\/[^/]+$/.test(p)) return true;
  return false;
}

async function unsetOnCollection(db, name) {
  const col = db.collection(name);
  const exists = await col.countDocuments().catch(() => 0);
  if (!exists && exists !== 0) {
    console.log(`${name}: skipped`);
    return;
  }
  const result = await col.updateMany({}, { $unset: PRODUCT_SEO_UNSET });
  console.log(`${name}: unset product SEO on ${result.modifiedCount} / ${exists} docs`);
}

async function main() {
  await connectDb();
  const db = mongoose.connection.db;

  await unsetOnCollection(db, "cabs");
  await unsetOnCollection(db, "drivers");
  await unsetOnCollection(db, "bustrips");
  await unsetOnCollection(db, "packages");

  const settings = await SiteSettings.findOne().lean();
  if (settings?.pageSeo && typeof settings.pageSeo === "object") {
    const pageSeo = { ...settings.pageSeo };
    const removed = [];
    for (const key of Object.keys(pageSeo)) {
      if (isProductSeoPath(key)) {
        delete pageSeo[key];
        removed.push(key);
      }
    }
    if (removed.length) {
      await SiteSettings.updateOne({ _id: settings._id }, { $set: { pageSeo } });
    }
    console.log(`siteSettings.pageSeo: removed ${removed.length} product paths`);
  } else {
    console.log("siteSettings.pageSeo: none");
  }

  const insightDel = await SeoPageInsight.deleteMany({
    $or: [
      { landingPage: { $regex: "^/cabs/(?!passenger$|results$)[^/?]+" } },
      { landingPage: { $regex: "^/drivers/(?!passenger$|results$)[^/?]+" } },
      { landingPage: { $regex: "^/buses/[^/?]+" } },
      { landingPage: { $regex: "^/packages/[^/?]+" } }
    ]
  }).catch(() => ({ deletedCount: 0 }));
  console.log(`seoPageInsights: deleted ${insightDel.deletedCount || 0} product rows`);

  await mongoose.disconnect();
  console.log("Done. City / service / route page SEO was not changed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
