"use strict";

/**
 * Backup then delete dropped city/route SEO rows.
 * Keep live: Chennai, Madurai, Tirupati, Trichy, Coimbatore, Vellore,
 * Kanchipuram, Kodaikanal, Ooty, Pondicherry + Chennai→Tirupati route.
 * Does not touch cabs, bookings, users, or OTP.
 *
 * Usage: node scripts/purgeDroppedSeoPages.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const { SeoCityPage } = require("../src/models/SeoCityPage");
const { SeoRoute } = require("../src/models/SeoRoute");
const { SeoLanding } = require("../src/models/SeoLanding");
const { SeoService } = require("../src/models/SeoService");
const { SeoPageInsight } = require("../src/models/SeoPageInsight");
const { SiteSettings } = require("../src/models/SiteSettings");
const { Offer } = require("../src/models/Offer");
const { RelatedContent } = require("../src/models/RelatedContent");

const KEEP_CITIES = new Set([
  "chennai",
  "madurai",
  "tirupati",
  "trichy",
  "coimbatore",
  "vellore",
  "kanchipuram",
  "kodaikanal",
  "ooty",
  "pondicherry",
  "sabarimala",
  "ayyappankovil"
]);
const CITY_ALIASES = {
  bangalore: "bengaluru",
  tiruchi: "trichy",
  tiruchy: "trichy",
  tiruchirappalli: "trichy",
  tiruchirapalli: "trichy",
  puducherry: "pondicherry",
  pondichery: "pondicherry",
  kodai: "kodaikanal",
  udhagamandalam: "ooty",
  udhagai: "ooty",
  sabarimalai: "sabarimala",
  pamba: "sabarimala",
  "ayyappan-kovil": "ayyappankovil",
  ayyappankoil: "ayyappankovil"
};
const KEEP_ROUTE_SLUGS = new Set(["chennai-to-tirupati-cab"]);
const RANKING_SERVICES = new Set(["airport-taxi", "outstation-cab", "one-way-cab", "tempo-traveller"]);
const KEEP_SITE_PATHS = new Set([
  "/",
  "/cabs",
  "/call-driver",
  "/acting-driver",
  "/cab-booking",
  "/tariff",
  "/about",
  "/contact",
  "/faq",
  "/blogs",
  "/blog",
  "/locations",
  "/testimonials",
  "/services",
  "/routes",
  "/terms-and-conditions",
  "/legal-declaration",
  "/cancellation-policy"
]);

function normalizeCity(slug) {
  const value = String(slug || "")
    .toLowerCase()
    .trim();
  return CITY_ALIASES[value] || value;
}

function isKeepCity(slug) {
  return KEEP_CITIES.has(normalizeCity(slug));
}

function isKeepRouteSlug(slug) {
  const value = String(slug || "").toLowerCase();
  if (KEEP_ROUTE_SLUGS.has(value)) return true;
  return value === "chennai-to-tirupati" || value.startsWith("chennai-to-tirupati");
}

function isDroppedSeoPath(raw) {
  const pathName = String(raw || "")
    .split("?")[0]
    .replace(/\/+$/, "") || "/";
  if (KEEP_SITE_PATHS.has(pathName)) return false;
  const parts = pathName.split("/").filter(Boolean);
  if (!parts.length) return false;

  if (parts[0] === "cab-booking" && parts[1]) return !isKeepCity(parts[1]);
  if (parts[0] === "acting-driver" && parts[1]) return !isKeepCity(parts[1]);
  if (parts[0] === "services" && parts[1] && parts[2]) {
    if (!RANKING_SERVICES.has(parts[1])) return true;
    return !isKeepCity(parts[2]);
  }
  if (parts[0] === "routes" && parts[1]) return !isKeepRouteSlug(parts[1]);
  if (parts[0] === "pages" && parts[1]) {
    const slug = String(parts[1] || "").toLowerCase();
    const droppedHints = ["bengaluru", "bangalore", "hyderabad", "mysore", "salem"];
    return droppedHints.some((city) => slug === city || slug.includes(`${city}-`) || slug.includes(`-${city}`));
  }
  if (parts.length === 2 && parts[1] === "airport-cab-booking") return !isKeepCity(parts[0]);
  if (parts.length === 2 && parts[1] === "acting-driver") return !isKeepCity(parts[0]);
  if (parts.length >= 2 && parts[1] === "outstation") {
    if (parts.length === 2) return true;
    return !isKeepRouteSlug(parts[2]);
  }
  if (parts.length === 1) {
    const city = normalizeCity(parts[0]);
    if (KEEP_CITIES.has(city) && city === parts[0]) return false;
    if (CITY_ALIASES[parts[0]] && isKeepCity(parts[0])) return false;
    if (["bengaluru", "bangalore", "hyderabad", "mysore", "salem", "rameswaram", "kochi", "mumbai", "delhi", "pune", "goa"].includes(parts[0])) {
      return true;
    }
  }
  return false;
}

function leanIds(docs) {
  return (docs || []).map((row) => ({
    _id: String(row._id),
    slug: row.slug || "",
    citySlug: row.citySlug || "",
    pageType: row.pageType || "",
    fromCitySlug: row.fromCitySlug || "",
    toCitySlug: row.toCitySlug || "",
    path: row.publicPath || row.landingPage || row.href || row.path || "",
    title: row.seoTitle || row.title || row.h1 || row.name || ""
  }));
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Missing MONGODB_URI");
    process.exit(1);
  }

  let dbName = "cabzii";
  try {
    dbName = decodeURIComponent(new URL(uri).pathname.replace(/^\//, "").split("/")[0] || "") || "cabzii";
  } catch {
    dbName = process.env.MONGODB_DB_NAME || "cabzii";
  }

  await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 20000 });
  console.log(`Connected. Purging dropped SEO pages (keep live ranking cities + Tirupati route).`);

  const cityPages = await SeoCityPage.find({}).lean();
  const dropCityPages = cityPages.filter((row) => !isKeepCity(row.citySlug));

  const routes = await SeoRoute.find({}).lean();
  const dropRoutes = routes.filter((row) => {
    const from = normalizeCity(row.fromCitySlug);
    const to = normalizeCity(row.toCitySlug);
    if (from === "chennai" && to === "tirupati") return false;
    return !isKeepRouteSlug(row.slug);
  });

  const landings = await SeoLanding.find({}).lean();
  const dropLandings = landings.filter((row) => {
    const pathName = row.publicPath || `/pages/${row.slug}`;
    if (isDroppedSeoPath(pathName)) return true;
    const slug = String(row.slug || "").toLowerCase();
    if (KEEP_CITIES.has(normalizeCity(slug))) return false;
    return ["bengaluru", "bangalore", "hyderabad", "salem", "mysore"].some((city) => slug.includes(city));
  });

  const services = await SeoService.find({}).lean();
  const dropServices = services.filter((row) => !RANKING_SERVICES.has(String(row.slug || "")));

  const insights = await SeoPageInsight.find({}).lean();
  const dropInsights = insights.filter((row) => isDroppedSeoPath(row.landingPage) || (row.city && !isKeepCity(row.city)));

  const offers = await Offer.find({}).lean();
  const dropOffers = offers.filter((row) => {
    if (isDroppedSeoPath(row.href)) return true;
    const href = String(row.href || "").toLowerCase();
    return /(bengaluru|bangalore|hyderabad|mysore|salem|kochi)([/?=&-]|$)/i.test(href);
  });

  const related = await RelatedContent.find({}).lean();
  const dropRelated = related.filter((row) => {
    const slugs = [row.sourceSlug, row.relatedSlug].filter(Boolean);
    return slugs.some((slug) => {
      if (isKeepRouteSlug(slug) || isKeepCity(slug)) return false;
      return isDroppedSeoPath(`/${slug}`) || isDroppedSeoPath(`/routes/${slug}`) || isDroppedSeoPath(`/cab-booking/${slug}`);
    });
  });

  const settings = await SiteSettings.findOne({ key: "main" }).lean();
  const pageSeo = settings?.pageSeo && typeof settings.pageSeo === "object" ? settings.pageSeo : {};
  const dropPageSeoKeys = Object.keys(pageSeo).filter((key) => isDroppedSeoPath(key));

  const backup = {
    at: new Date().toISOString(),
    keepCities: [...KEEP_CITIES],
    keepRouteSlugs: [...KEEP_ROUTE_SLUGS],
    seoCityPages: dropCityPages,
    seoRoutes: dropRoutes,
    seoLandings: dropLandings,
    seoServices: dropServices,
    seoPageInsights: dropInsights,
    offers: dropOffers,
    relatedContent: dropRelated,
    pageSeoKeys: dropPageSeoKeys,
    pageSeoValues: Object.fromEntries(dropPageSeoKeys.map((key) => [key, pageSeo[key]]))
  };

  const outDir = path.join(__dirname, "..", "..", "cabzii-ultimate", "reports");
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 10);
  const backupPath = path.join(outDir, `seo-dropped-backup-${stamp}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), "utf8");
  console.log(`Backup written: ${backupPath}`);
  console.log(
    JSON.stringify(
      {
        cityPagesToDelete: dropCityPages.length,
        routesToDelete: dropRoutes.length,
        landingsToDelete: dropLandings.length,
        servicesToDelete: dropServices.length,
        insightsToDelete: dropInsights.length,
        offersToDelete: dropOffers.length,
        relatedToDelete: dropRelated.length,
        pageSeoKeysToDelete: dropPageSeoKeys.length
      },
      null,
      2
    )
  );

  if (dropCityPages.length) {
    const ids = dropCityPages.map((row) => row._id);
    const result = await SeoCityPage.deleteMany({ _id: { $in: ids } });
    console.log(`Deleted SeoCityPage: ${result.deletedCount}`);
    console.log(leanIds(dropCityPages).slice(0, 20));
  }

  if (dropRoutes.length) {
    const ids = dropRoutes.map((row) => row._id);
    const result = await SeoRoute.deleteMany({ _id: { $in: ids } });
    console.log(`Deleted SeoRoute: ${result.deletedCount}`);
  }

  if (dropLandings.length) {
    const ids = dropLandings.map((row) => row._id);
    const result = await SeoLanding.deleteMany({ _id: { $in: ids } });
    console.log(`Deleted SeoLanding: ${result.deletedCount}`);
  }

  if (dropServices.length) {
    const ids = dropServices.map((row) => row._id);
    const result = await SeoService.deleteMany({ _id: { $in: ids } });
    console.log(`Deleted non-ranking SeoService: ${result.deletedCount}`);
  }

  await SeoService.updateMany({ slug: { $in: [...RANKING_SERVICES] } }, { $set: { citySlugs: [...KEEP_CITIES], allCities: false, menuCitySlug: "chennai" } });

  if (dropInsights.length) {
    const ids = dropInsights.map((row) => row._id);
    const result = await SeoPageInsight.deleteMany({ _id: { $in: ids } });
    console.log(`Deleted SeoPageInsight: ${result.deletedCount}`);
  }

  if (dropOffers.length) {
    const ids = dropOffers.map((row) => row._id);
    const result = await Offer.deleteMany({ _id: { $in: ids } });
    console.log(`Deleted homepage Offer cards: ${result.deletedCount}`);
  }

  for (const city of KEEP_CITIES) {
    await Offer.updateMany({ href: `/${city}` }, { $set: { href: `/cab-booking/${city}` } });
  }
  await Offer.updateMany(
    { href: "/routes/chennai-to-tirupati-cab" },
    { $set: { href: "/chennai/outstation/chennai-to-tirupati" } }
  );
  await Offer.updateMany(
    { href: "/services/airport-taxi/chennai" },
    { $set: { href: "/chennai/airport-cab-booking" } }
  );

  if (dropRelated.length) {
    const ids = dropRelated.map((row) => row._id);
    const result = await RelatedContent.deleteMany({ _id: { $in: ids } });
    console.log(`Deleted RelatedContent: ${result.deletedCount}`);
  }

  if (dropPageSeoKeys.length && settings) {
    const nextPageSeo = { ...pageSeo };
    for (const key of dropPageSeoKeys) delete nextPageSeo[key];
    await SiteSettings.updateOne({ _id: settings._id }, { $set: { pageSeo: nextPageSeo } });
    console.log(`Removed SiteSettings.pageSeo keys: ${dropPageSeoKeys.length}`);
  }

  const remaining = {
    seoCityPages: await SeoCityPage.countDocuments(),
    seoRoutes: await SeoRoute.countDocuments(),
    seoLandings: await SeoLanding.countDocuments(),
    seoServices: await SeoService.countDocuments(),
    citySlugsLeft: (await SeoCityPage.distinct("citySlug")).sort()
  };
  console.log("Remaining SEO CMS:", remaining);

  await mongoose.disconnect();
  console.log("Done. Dropped city/route pages are removed from Mongo. Live URLs still 301 away.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
