"use strict";

/**
 * Import built-in service & route pages into MongoDB so admin can edit them.
 * Prefer Admin → Services / Routes → "Import to database".
 * This script seeds ranking services + the live Chennai–Tirupati route only.
 *
 * Usage: node scripts/seedSeoCms.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const path = require("path");
const { SeoService } = require(path.join(__dirname, "..", "src", "models", "SeoService"));
const { SeoRoute } = require(path.join(__dirname, "..", "src", "models", "SeoRoute"));
const { autoSeoServiceFields, autoSeoRouteFields } = require(path.join(__dirname, "..", "src", "utils", "seoAutoFill"));

const SERVICES = [
  { slug: "airport-taxi", name: "Airport Taxi", priceFrom: 1200, highlights: ["MAA/BLR/HYD terminal pickup", "Flight buffer time", "Fixed fare quote"] },
  { slug: "outstation-cab", name: "Outstation Cab", priceFrom: 3250, highlights: ["Round trip & one way", "Per km fare shown upfront", "Highway-experienced drivers"] },
  { slug: "one-way-cab", name: "One Way Cab", priceFrom: 3250, highlights: ["Inter-city one way drops", "Sedan, SUV & Innova", "No return charge confusion"] },
  { slug: "tempo-traveller", name: "Tempo Traveller", priceFrom: 3000, highlights: ["12, 13, 14, 16 and 18 seater options", "Group & family trips", "AC tempo for outstation"] }
];

const ROUTES = [
  { slug: "chennai-to-tirupati-cab", from: "chennai", to: "tirupati", distance: "135 km", duration: "3–4 hours", sedanFrom: 3299, suvFrom: 4299 }
];

async function upsertServices() {
  let n = 0;
  for (const row of SERVICES) {
    const seo = autoSeoServiceFields({ name: row.name, menuCitySlug: "chennai", priceFrom: row.priceFrom });
    const payload = {
      slug: row.slug,
      name: seo.name,
      seoTitle: seo.seoTitle,
      seoDescription: seo.seoDescription,
      seo: seo.seo,
      primaryKeyword: row.name.toLowerCase(),
      searchQuery: row.name.toLowerCase(),
      priceFrom: row.priceFrom,
      highlights: row.highlights,
      published: true,
      showInMenu: false,
      menuCitySlug: "chennai",
      allCities: true,
      citySlugs: []
    };
    await SeoService.findOneAndUpdate({ slug: row.slug }, payload, { upsert: true, new: true, setDefaultsOnInsert: true });
    n += 1;
    console.log(`  service: ${row.slug}`);
  }
  console.log(`Services: ${n} upserted`);
}

async function upsertRoutes() {
  let n = 0;
  for (const row of ROUTES) {
    const seo = autoSeoRouteFields({
      fromCitySlug: row.from,
      toCitySlug: row.to,
      distance: row.distance,
      sedanFrom: row.sedanFrom
    });
    const payload = {
      slug: row.slug,
      title: seo.title,
      seoTitle: seo.seoTitle,
      seoDescription: seo.seoDescription,
      seo: seo.seo,
      fromCitySlug: row.from,
      toCitySlug: row.to,
      distance: row.distance,
      duration: row.duration,
      sedanFrom: row.sedanFrom,
      suvFrom: row.suvFrom,
      published: true,
      showInMenu: false
    };
    await SeoRoute.findOneAndUpdate({ slug: row.slug }, payload, { upsert: true, new: true, setDefaultsOnInsert: true });
    n += 1;
    console.log(`  route: ${row.slug}`);
  }
  console.log(`Routes: ${n} upserted`);
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Missing MONGODB_URI");
    process.exit(1);
  }
  await mongoose.connect(uri);
  console.log("Seeding SEO CMS…");
  await upsertServices();
  await upsertRoutes();
  await mongoose.disconnect();
  console.log("Done. Ranking services + Chennai–Tirupati route only.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
