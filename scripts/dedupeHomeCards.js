"use strict";

/**
 * One-off: remove duplicate homepage cards (same section + title + href).
 * Keeps the newest document. Safe to re-run.
 *
 *   node scripts/dedupeHomeCards.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const { Offer } = require("../src/models/Offer");
const { homeCardDedupeKey } = require("../src/utils/homeCards");

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error("Missing MONGODB_URI");
    process.exit(1);
  }
  await mongoose.connect(uri);
  const rows = await Offer.find({}).sort({ updatedAt: -1, createdAt: -1 }).select("_id section title href").lean();
  const seen = new Set();
  const duplicateIds = [];
  for (const row of rows) {
    const key = homeCardDedupeKey(row);
    if (seen.has(key)) duplicateIds.push(row._id);
    else seen.add(key);
  }
  if (duplicateIds.length) {
    const res = await Offer.deleteMany({ _id: { $in: duplicateIds } });
    console.log(`Deleted ${res.deletedCount} duplicate homepage cards.`);
  } else {
    console.log("No duplicate homepage cards.");
  }
  const remaining = await Offer.aggregate([{ $group: { _id: "$section", n: { $sum: 1 } } }]);
  console.log("Remaining by section:", remaining);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
