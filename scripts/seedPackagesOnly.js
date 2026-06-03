"use strict";

/** Insert holiday packages when collection is empty (does not delete cabs/drivers). */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const { packages } = require("./contentData");
const { Package } = require(path.join(__dirname, "..", "src", "models", "Package"));

function omitId(doc) {
  const { id, ...rest } = doc;
  return { ...rest, status: "active", isDeleted: false };
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Missing MONGODB_URI");
    process.exit(1);
  }

  await mongoose.connect(uri);
  const existing = await Package.countDocuments({ isDeleted: { $ne: true } });
  if (existing > 0) {
    console.log(`Packages already exist (${existing}). Skipping.`);
    await mongoose.disconnect();
    return;
  }

  const inserted = await Package.insertMany(packages.map(omitId));
  console.log(`Inserted ${inserted.length} holiday packages.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
