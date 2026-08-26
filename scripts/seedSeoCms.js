"use strict";

/**
 * Import built-in service & route pages into MongoDB so admin can edit them.
 * Prefer Admin → Services / Routes → "Import to database" (imports the full route mesh).
 * This script seeds the core service list + priority routes as a CLI fallback.
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
  { slug: "driver-on-hire", name: "Driver on Hire", priceFrom: 500, highlights: ["Use your own car", "Hourly & daily packages", "Verified chauffeurs"] },
  { slug: "chauffeur-service", name: "Chauffeur Service", priceFrom: 500, highlights: ["Corporate & wedding travel", "Professional presentation", "Multi-stop city runs"] },
  { slug: "tempo-traveller", name: "Tempo Traveller", priceFrom: 3000, highlights: ["12, 13, 14, 16 and 18 seater options", "Group & family trips", "AC tempo for outstation"] },
  { slug: "car-rental", name: "Car Rental", priceFrom: 1200, highlights: ["Self-drive alternatives via cab", "Sedan & SUV fleet", "Daily rental slabs"] },
  { slug: "cab-rental", name: "Cab Rental", priceFrom: 1200, highlights: ["Local day packages", "Extra km rates listed", "Vendor comparison"] },
  { slug: "local-taxi", name: "Local Taxi", priceFrom: 1200, highlights: ["City point-to-point rides", "Hourly city packages", "Near-me pickup search"] },
  { slug: "hourly-rental", name: "Hourly Rental Taxi", priceFrom: 1200, highlights: ["4hr / 8hr local packages", "Ideal for errands & meetings", "Transparent extra hour rate"] },
  { slug: "tour-packages", name: "Holiday Packages", priceFrom: 6999, highlights: ["Pilgrimage circuits", "Beach & hill getaways", "Tirupati & Rameswaram tours"] },
  { slug: "acting-driver", name: "Acting Driver", priceFrom: 500, highlights: ["Driver for your car", "Hourly & outstation", "Verified chauffeurs"] }
];

const ROUTES = [
  { slug: "chennai-to-bangalore-cab", from: "chennai", to: "bengaluru", distance: "350 km", duration: "6–7 hours", sedanFrom: 5499, suvFrom: 7499 },
  { slug: "chennai-to-pondicherry-cab", from: "chennai", to: "pondicherry", distance: "160 km", duration: "3–4 hours", sedanFrom: 2899, suvFrom: 3799 },
  { slug: "chennai-to-tirupati-cab", from: "chennai", to: "tirupati", distance: "135 km", duration: "3–4 hours", sedanFrom: 3299, suvFrom: 4299 },
  { slug: "chennai-to-coimbatore-cab", from: "chennai", to: "coimbatore", distance: "505 km", duration: "8–9 hours", sedanFrom: 7499, suvFrom: 9999 },
  { slug: "chennai-to-madurai-cab", from: "chennai", to: "madurai", distance: "460 km", duration: "7–8 hours", sedanFrom: 6999, suvFrom: 9299 },
  { slug: "chennai-to-rameswaram-cab", from: "chennai", to: "rameswaram", distance: "560 km", duration: "9–10 hours", sedanFrom: 8499, suvFrom: 10999 },
  { slug: "bengaluru-to-mysore-cab", from: "bengaluru", to: "mysore", distance: "145 km", duration: "3 hours", sedanFrom: 2499, suvFrom: 3499 },
  { slug: "bengaluru-to-chennai-cab", from: "bengaluru", to: "chennai", distance: "350 km", duration: "6–7 hours", sedanFrom: 5499, suvFrom: 7499 },
  { slug: "bengaluru-to-hyderabad-cab", from: "bengaluru", to: "hyderabad", distance: "575 km", duration: "9–10 hours", sedanFrom: 8499, suvFrom: 10999 },
  { slug: "hyderabad-to-bengaluru-cab", from: "hyderabad", to: "bengaluru", distance: "575 km", duration: "9–10 hours", sedanFrom: 8499, suvFrom: 10999 }
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
  console.log("Done. Prefer Admin → Services/Routes → Import to database for the full mesh.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
