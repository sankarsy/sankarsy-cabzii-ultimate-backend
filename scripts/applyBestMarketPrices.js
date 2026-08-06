/**
 * Remove ALL holiday-package discounts and set competitive market selling prices
 * (no MRP / no % OFF). Admin can add discounts later manually.
 *
 * Also updates SEO service + route starting fares from market benchmarks.
 *
 * Usage: node scripts/applyBestMarketPrices.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const { Package } = require("../src/models/Package");
const { SeoService } = require("../src/models/SeoService");
const { SeoRoute } = require("../src/models/SeoRoute");
const { SiteSettings } = require("../src/models/SiteSettings");

/**
 * Cab-tour package “from” fares — competitive vs 2026 operator listings
 * (Tirupati private sedan ~₹7.2k+, Rameswaram cab hire ~₹15.5k/2D, Kerala/Ooty mid-tier).
 * Price = final payable (discount 0).
 */
const PACKAGE_PRICES = {
  "Tirupati Balaji Darshan": 6999,
  "Rameswaram & Madurai Temple Circuit": 11999,
  "Shirdi Sai Baba Pilgrimage": 8499,
  "Varanasi Ganga Aarti Experience": 12999,
  "Goa Beach & Nightlife Escape": 12999,
  "Kerala Backwater & Munnar": 16999,
  "Rajasthan Forts & Palaces": 21999,
  "Manali & Solang Adventure": 16999,
  "Andaman Honeymoon Bliss": 28999,
  "Ooty & Kodaikanal Family Hills": 12999
};

/** SEO service cards — Chennai market starting fares (no promo). */
const SERVICE_PRICES = {
  "airport-taxi": 699,
  "outstation-cab": 1499,
  "one-way-cab": 4999,
  "driver-on-hire": 499,
  "chauffeur-service": 599,
  "tempo-traveller": 3499,
  "car-rental": 1299,
  "cab-rental": 1499,
  "local-taxi": 399,
  "hourly-rental": 349,
  "tour-packages": 6999,
  "acting-driver": 499
};

/** Priority outstation routes — sedan / SUV from 2026 TN market (~₹14–15/km sedan). */
const ROUTE_PRICES = {
  "chennai-to-bangalore-cab": { sedanFrom: 5499, suvFrom: 7499 },
  "chennai-to-pondicherry-cab": { sedanFrom: 2899, suvFrom: 3799 },
  "chennai-to-tirupati-cab": { sedanFrom: 3299, suvFrom: 4299 },
  "chennai-to-coimbatore-cab": { sedanFrom: 7499, suvFrom: 9999 },
  "chennai-to-madurai-cab": { sedanFrom: 6999, suvFrom: 9299 },
  "chennai-to-rameswaram-cab": { sedanFrom: 8499, suvFrom: 10999 },
  "bengaluru-to-mysore-cab": { sedanFrom: 2499, suvFrom: 3499 },
  "bengaluru-to-chennai-cab": { sedanFrom: 5499, suvFrom: 7499 },
  "bengaluru-to-hyderabad-cab": { sedanFrom: 8499, suvFrom: 10999 },
  "hyderabad-to-bengaluru-cab": { sedanFrom: 8499, suvFrom: 10999 }
};

function patchContentData() {
  const file = path.join(__dirname, "contentData.js");
  let src = fs.readFileSync(file, "utf8");
  const start = src.indexOf("const packages = [");
  const end = src.indexOf("const blogs = [");
  if (start < 0 || end < 0) throw new Error("contentData markers missing");
  let block = src.slice(start, end);
  block = block.replace(/originalPrice:\s*\d+/g, "originalPrice: 0");
  block = block.replace(/discountPercentage:\s*\d+/g, "discountPercentage: 0");
  for (const [name, price] of Object.entries(PACKAGE_PRICES)) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(name:\\s*"${escaped}"[\\s\\S]*?price:\\s*)\\d+`);
    if (!re.test(block)) {
      console.warn("contentData miss:", name);
      continue;
    }
    block = block.replace(re, `$1${price}`);
  }
  src = src.slice(0, start) + block + src.slice(end);
  fs.writeFileSync(file, src);
  console.log("✓ contentData.js packages → best price, discount 0");
}

function patchSeedSeoCms() {
  const file = path.join(__dirname, "seedSeoCms.js");
  let src = fs.readFileSync(file, "utf8");
  for (const [slug, price] of Object.entries(SERVICE_PRICES)) {
    const re = new RegExp(`(slug:\\s*"${slug}"[\\s\\S]*?priceFrom:\\s*)\\d+`);
    if (re.test(src)) src = src.replace(re, `$1${price}`);
  }
  for (const [slug, fares] of Object.entries(ROUTE_PRICES)) {
    const reSedan = new RegExp(`(slug:\\s*"${slug}"[\\s\\S]*?sedanFrom:\\s*)\\d+`);
    const reSuv = new RegExp(`(slug:\\s*"${slug}"[\\s\\S]*?suvFrom:\\s*)\\d+`);
    if (reSedan.test(src)) src = src.replace(reSedan, `$1${fares.sedanFrom}`);
    if (reSuv.test(src)) src = src.replace(reSuv, `$1${fares.suvFrom}`);
  }
  fs.writeFileSync(file, src);
  console.log("✓ seedSeoCms.js service/route fares updated");
}

function patchFrontendServices() {
  const file = path.join(__dirname, "../../cabzii-ultimate/src/lib/seo/services.js");
  if (!fs.existsSync(file)) {
    console.warn("skip frontend services.js");
    return;
  }
  let src = fs.readFileSync(file, "utf8");
  for (const [slug, price] of Object.entries(SERVICE_PRICES)) {
    const re = new RegExp(`(slug:\\s*"${slug}"[\\s\\S]*?priceFrom:\\s*)\\d+`);
    if (re.test(src)) src = src.replace(re, `$1${price}`);
  }
  fs.writeFileSync(file, src);
  console.log("✓ frontend seo/services.js priceFrom updated");
}

function patchFrontendRoutes() {
  const file = path.join(__dirname, "../../cabzii-ultimate/src/lib/seo/routes.js");
  if (!fs.existsSync(file)) {
    console.warn("skip frontend routes.js");
    return;
  }
  let src = fs.readFileSync(file, "utf8");
  for (const [slug, fares] of Object.entries(ROUTE_PRICES)) {
    const reSedan = new RegExp(`(slug:\\s*"${slug}"[\\s\\S]*?sedanFrom:\\s*)\\d+`);
    const reSuv = new RegExp(`(slug:\\s*"${slug}"[\\s\\S]*?suvFrom:\\s*)\\d+`);
    if (reSedan.test(src)) src = src.replace(reSedan, `$1${fares.sedanFrom}`);
    if (reSuv.test(src)) src = src.replace(reSuv, `$1${fares.suvFrom}`);
  }
  fs.writeFileSync(file, src);
  console.log("✓ frontend seo/routes.js fares updated");
}

async function patchDatabase() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error("Missing MONGODB_URI");
  await mongoose.connect(uri);

  /* Clear discounts on every package */
  const cleared = await Package.updateMany({}, { $set: { discountPercentage: 0, originalPrice: 0 } });
  console.log(`✓ Cleared discount on ${cleared.modifiedCount} package(s)`);

  for (const [name, price] of Object.entries(PACKAGE_PRICES)) {
    const res = await Package.updateMany({ name }, { $set: { price, discountPercentage: 0, originalPrice: 0 } });
    console.log(`  ${name} → ₹${price} (${res.modifiedCount} updated)`);
  }

  for (const [slug, priceFrom] of Object.entries(SERVICE_PRICES)) {
    const res = await SeoService.updateMany({ slug }, { $set: { priceFrom } });
    console.log(`  service ${slug} from ₹${priceFrom} (${res.modifiedCount})`);
  }

  for (const [slug, fares] of Object.entries(ROUTE_PRICES)) {
    const res = await SeoRoute.updateMany({ slug }, { $set: fares });
    console.log(`  route ${slug} sedan ₹${fares.sedanFrom} / SUV ₹${fares.suvFrom} (${res.modifiedCount})`);
  }

  /* Remove fake homepage “20% OFF” promo until admin sets a real discount */
  const settings = await SiteSettings.findOne({ key: "main" });
  if (settings?.hero) {
    const hero = typeof settings.hero.toObject === "function" ? settings.hero.toObject() : { ...settings.hero };
    hero.promoBadge = "";
    hero.promoTitle = "";
    hero.promoSubtitle = "Transparent fares";
    settings.hero = hero;
    settings.markModified("hero");
    await settings.save();
    console.log("✓ Cleared homepage hero discount promo");
  }

  await mongoose.disconnect();
}

async function main() {
  patchContentData();
  patchSeedSeoCms();
  patchFrontendServices();
  patchFrontendRoutes();
  await patchDatabase();
  console.log("\nDone. All package discounts removed; best market prices applied.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
