"use strict";

/**
 * Loads cabzii-ultimate `travelData` snapshot from ./sampleData.js (regenerate via `npm run seed:sync`).
 * Default: clears cabs, packages, drivers then inserts all sample rows.
 * Flags:
 *   --append        Do not delete existing rows before insert (may duplicate).
 *   --with-bookings Insert 3 demo bookings (same phone); removes prior seed bookings for that phone first.
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const path = require("path");

const { cabs, packages, driverServices } = require("./sampleData");
const { Cab } = require(path.join(__dirname, "..", "src", "models", "Cab"));
const { Package } = require(path.join(__dirname, "..", "src", "models", "Package"));
const { Driver } = require(path.join(__dirname, "..", "src", "models", "Driver"));
const { Booking } = require(path.join(__dirname, "..", "src", "models", "Booking"));

const SAMPLE_BOOKING_PHONE = "910000000099";

function omitId(doc) {
  const { id, ...rest } = doc;
  return rest;
}

function toDriverDoc(service) {
  const name = service.type.replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    name,
    vendor: "",
    experience: "5 Years",
    trips: 500,
    rating: service.rating,
    languages: ["Hindi", "English"],
    supportedVehicles: ["Sedan", "SUV", "Van"],
    pricing: {
      hourly: service.pricing?.["4 hour"] ?? service.pricing?.["12 hour"] ?? 300,
      day: service.pricing?.day ?? 2400,
      extraHour: service.serviceCharges?.extraHour ?? 80
    },
    seo: service.seo || "",
    seoTitle: service.seoTitle || "",
    seoDescription: service.seoDescription || ""
  };
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Missing MONGODB_URI in cabzii-ultimate-backend/.env");
    process.exit(1);
  }

  const append = process.argv.includes("--append");
  const withBookings = process.argv.includes("--with-bookings");

  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  if (!append) {
    const cabR = await Cab.deleteMany({});
    const pkgR = await Package.deleteMany({});
    const drvR = await Driver.deleteMany({});
    console.log(`Cleared cabs=${cabR.deletedCount} packages=${pkgR.deletedCount} drivers=${drvR.deletedCount}`);
  }

  const cabDocs = cabs.map(omitId);
  const pkgDocs = packages.map(omitId);
  const driverDocs = driverServices.map(toDriverDoc);

  const insertedCabs = await Cab.insertMany(cabDocs);
  const insertedPkgs = await Package.insertMany(pkgDocs);
  const insertedDrivers = await Driver.insertMany(driverDocs);

  console.log(`Inserted cabs=${insertedCabs.length} packages=${insertedPkgs.length} drivers=${insertedDrivers.length}`);

  if (withBookings) {
    await Booking.deleteMany({ phone: SAMPLE_BOOKING_PHONE });
    const cabId = insertedCabs[0]._id;
    const pkgId = insertedPkgs[0]._id;
    const drvId = insertedDrivers[0]._id;
    await Booking.insertMany([
      {
        customerName: "Sample User (seed)",
        phone: SAMPLE_BOOKING_PHONE,
        email: "sample@example.com",
        type: "cab",
        itemId: cabId,
        pickup: "New Delhi Railway Station",
        drop: "Indira Gandhi Airport",
        date: "2026-06-15",
        routeType: "Local",
        tripType: "One Way",
        amount: insertedCabs[0].price,
        status: "pending"
      },
      {
        customerName: "Sample User (seed)",
        phone: SAMPLE_BOOKING_PHONE,
        email: "sample@example.com",
        type: "tour",
        itemId: pkgId,
        pickup: "Chandigarh",
        drop: "Shimla",
        date: "2026-06-20",
        routeType: "Outstation",
        tripType: "Round Trip",
        amount: insertedPkgs[0].price,
        status: "confirmed"
      },
      {
        customerName: "Sample User (seed)",
        phone: SAMPLE_BOOKING_PHONE,
        email: "sample@example.com",
        type: "driver",
        itemId: drvId,
        pickup: "MG Road, Bengaluru",
        drop: "Electronic City",
        date: "2026-06-22",
        routeType: "Local",
        tripType: "One Way",
        amount: insertedDrivers[0].pricing.hourly * 4,
        status: "pending"
      }
    ]);
    console.log(`Inserted 3 sample bookings for phone ${SAMPLE_BOOKING_PHONE} (--with-bookings)`);
  }

  await mongoose.disconnect();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
