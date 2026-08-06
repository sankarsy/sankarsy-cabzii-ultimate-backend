/**
 * Sync holiday package selling prices to competitive market benchmarks (cab-tour packages).
 * Sources: Chennai–Tirupati private cab tours ~₹7.2k–11k sedan; Goa/Kerala beach-hill cab packages mid-tier.
 * No discounts applied — admin can add promos later.
 *
 * Usage: node scripts/updatePackageMarketPrices.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const { Package } = require("../src/models/Package");

const MARKET_PRICES = {
  "Tirupati Balaji Darshan": 5999,
  "Rameswaram & Madurai Temple Circuit": 8499,
  "Shirdi Sai Baba Pilgrimage": 6999,
  "Varanasi Ganga Aarti Experience": 9999,
  "Goa Beach & Nightlife Escape": 10999,
  "Kerala Backwater & Munnar": 14999,
  "Rajasthan Forts & Palaces": 17999,
  "Manali & Solang Adventure": 13999,
  "Andaman Honeymoon Bliss": 26999,
  "Ooty & Kodaikanal Family Hills": 8999
};

function patchContentDataFile() {
  const file = path.join(__dirname, "contentData.js");
  let src = fs.readFileSync(file, "utf8");
  for (const [name, price] of Object.entries(MARKET_PRICES)) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(name:\\s*"${escaped}"[\\s\\S]*?price:\\s*)\\d+`);
    if (!re.test(src)) {
      console.warn("contentData miss:", name);
      continue;
    }
    src = src.replace(re, `$1${price}`);
  }
  fs.writeFileSync(file, src);
  console.log("Patched contentData.js prices.");
}

async function patchDatabase() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.warn("No Mongo URI — skipped DB price update.");
    return;
  }
  await mongoose.connect(uri);
  let n = 0;
  for (const [name, price] of Object.entries(MARKET_PRICES)) {
    const res = await Package.updateMany(
      { name, isDeleted: { $ne: true } },
      { $set: { price, originalPrice: 0, discountPercentage: 0 } }
    );
    n += res.modifiedCount;
    console.log(`${name}: matched ${res.matchedCount}, updated ${res.modifiedCount} → ₹${price}`);
  }
  console.log(`DB updated ${n} package document(s).`);
  await mongoose.disconnect();
}

async function main() {
  patchContentDataFile();
  await patchDatabase();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
