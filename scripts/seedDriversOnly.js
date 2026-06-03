"use strict";

/** Insert sample drivers when collection is empty (does not delete cabs). */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const path = require("path");
const { driverServices } = require("./contentData");
const { buildDefaultDriverFarePackages } = require(path.join(__dirname, "..", "src", "utils", "driverFarePackages"));
const { Driver } = require(path.join(__dirname, "..", "src", "models", "Driver"));

function toDriverDoc(service) {
  const doc = {
    name: service.name || service.serviceTitle || "Acting Driver",
    vendor: service.vendor || "Cabzii Partner",
    type: service.type || "local",
    experience: service.experience || "5+ Years",
    trips: service.trips ?? 800,
    rating: service.rating || "4.8",
    discountPercentage: service.discountPercentage ?? 0,
    image: service.image || "",
    languages: service.languages || ["Hindi", "English", "Tamil"],
    supportedVehicles: service.supportedVehicles || ["Sedan", "SUV"],
    city: service.city || "Chennai",
    location: service.location || "",
    pricing: {
      hourly: service.pricing?.hourly ?? 280,
      day: service.pricing?.day ?? 2800,
      extraHour: service.pricing?.extraHour ?? 220
    },
    seo: service.seo || "",
    seoTitle: service.seoTitle || "",
    seoDescription: service.seoDescription || "",
    status: "active"
  };
  return {
    ...doc,
    farePackages:
      service.farePackages && Object.keys(service.farePackages).length
        ? service.farePackages
        : buildDefaultDriverFarePackages(doc)
  };
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Missing MONGODB_URI");
    process.exit(1);
  }

  await mongoose.connect(uri);
  const existing = await Driver.countDocuments({ isDeleted: { $ne: true } });
  if (existing > 0) {
    console.log(`Drivers already exist (${existing}). Skipping seed.`);
    await mongoose.disconnect();
    return;
  }

  const docs = driverServices.map(toDriverDoc);
  const inserted = await Driver.insertMany(docs);
  console.log(`Inserted ${inserted.length} drivers.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
