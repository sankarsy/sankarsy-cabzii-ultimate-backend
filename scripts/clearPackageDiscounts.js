/**
 * Clear holiday package discounts (manual promos only going forward).
 * Sets discountPercentage = 0 and originalPrice = 0 for every package.
 *
 * Usage: node scripts/clearPackageDiscounts.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const { Package } = require("../src/models/Package");

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error("Missing MONGODB_URI / MONGO_URI");
    process.exit(1);
  }
  await mongoose.connect(uri);
  const result = await Package.updateMany(
    {},
    { $set: { discountPercentage: 0, originalPrice: 0 } }
  );
  console.log(`Cleared discounts on ${result.modifiedCount} package(s) (${result.matchedCount} matched).`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
