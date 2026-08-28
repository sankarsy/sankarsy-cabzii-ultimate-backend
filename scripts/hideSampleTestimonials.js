"use strict";

/** Hide seeded/sample testimonials from the public site. Does not delete them. */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const path = require("path");
const { Testimonial } = require(path.join(__dirname, "..", "src", "models", "Testimonial"));

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Missing MONGODB_URI");
    process.exit(1);
  }
  await mongoose.connect(uri);
  const result = await Testimonial.updateMany(
    { $or: [{ sampleReview: true }, { published: true }] },
    { $set: { published: false, sampleReview: true } }
  );
  console.log(`Hidden sample testimonials: matched=${result.matchedCount} modified=${result.modifiedCount}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
