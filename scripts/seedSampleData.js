"use strict";

/**
 * Loads catalog from ./contentData.js (cabs, packages, drivers, blogs, testimonials).
 * Default: clears cabs, packages, drivers then inserts all sample rows.
 * Flags:
 *   --append        Do not delete existing rows before insert (may duplicate).
 *   --with-bookings Insert 3 demo bookings (same phone); removes prior seed bookings for that phone first.
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const path = require("path");

const { cabs, packages, driverServices, blogs, testimonials } = require("./contentData");
const { buildDefaultDriverFarePackages } = require(path.join(__dirname, "..", "src", "utils", "driverFarePackages"));
const { Cab } = require(path.join(__dirname, "..", "src", "models", "Cab"));
const { Package } = require(path.join(__dirname, "..", "src", "models", "Package"));
const { Driver } = require(path.join(__dirname, "..", "src", "models", "Driver"));
const { Booking } = require(path.join(__dirname, "..", "src", "models", "Booking"));
const { Blog } = require(path.join(__dirname, "..", "src", "models", "Blog"));
const { Testimonial } = require(path.join(__dirname, "..", "src", "models", "Testimonial"));

const SAMPLE_BOOKING_PHONE = "910000000099";

function omitId(doc) {
  const { id, ...rest } = doc;
  return rest;
}

function slugifyTitle(title) {
  return String(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function toBlogDoc(post) {
  const { id, ...rest } = post;
  return {
    ...rest,
    slug: post.slug || `post-${id}-${slugifyTitle(post.title)}`
  };
}

function toTestimonialDoc(item, index) {
  const { id, ...rest } = item;
  return { ...rest, sortOrder: index };
}

function toDriverDoc(service) {
  const doc = {
    name: service.name || service.serviceTitle || "Acting Driver",
    vendor: service.vendor || service.serviceSubtitle || "Cabzii Partner",
    type: service.type || "local",
    experience: service.experience || "5+ Years",
    trips: service.trips ?? 800,
    rating: service.rating || "4.8",
    discountPercentage: service.discountPercentage ?? 0,
    image: service.image || "",
    languages: service.languages || ["Hindi", "English"],
    supportedVehicles: service.supportedVehicles || ["Sedan", "SUV"],
    city: service.city || "",
    location: service.location || "",
    pricing: {
      hourly: service.pricing?.hourly ?? 280,
      day: service.pricing?.day ?? 2800,
      extraHour: service.pricing?.extraHour ?? 220
    },
    seo: service.seo || "",
    seoTitle: service.seoTitle || "",
    seoDescription: service.seoDescription || ""
  };
  const farePackages =
    service.farePackages && Object.keys(service.farePackages).length
      ? service.farePackages
      : buildDefaultDriverFarePackages(doc);
  return {
    ...doc,
    farePackages
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
    const blogR = await Blog.deleteMany({});
    const testR = await Testimonial.deleteMany({});
    console.log(
      `Cleared cabs=${cabR.deletedCount} packages=${pkgR.deletedCount} drivers=${drvR.deletedCount} blogs=${blogR.deletedCount} testimonials=${testR.deletedCount}`
    );
  }

  const cabDocs = cabs.map(omitId);
  const pkgDocs = packages.map(omitId);
  const driverDocs = driverServices.map(toDriverDoc);

  const blogDocs = blogs.map(toBlogDoc);
  const testimonialDocs = testimonials.map(toTestimonialDoc);

  const insertedCabs = await Cab.insertMany(cabDocs);
  const insertedPkgs = await Package.insertMany(pkgDocs);
  const insertedDrivers = await Driver.insertMany(driverDocs);
  const insertedBlogs = await Blog.insertMany(blogDocs);
  const insertedTestimonials = await Testimonial.insertMany(testimonialDocs);

  console.log(
    `Inserted cabs=${insertedCabs.length} packages=${insertedPkgs.length} drivers=${insertedDrivers.length} blogs=${insertedBlogs.length} testimonials=${insertedTestimonials.length}`
  );

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
