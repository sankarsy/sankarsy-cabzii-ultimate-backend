"use strict";

/**
 * Seed 10 sample vehicles with dynamic packages array.
 * Usage: node scripts/seedVehicles.js [--append]
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const path = require("path");
const { Cab } = require(path.join(__dirname, "..", "src", "models", "Cab"));
const { syncVehiclePricing } = require(path.join(__dirname, "..", "src", "utils", "vehiclePackages"));
const { applyVehicleSeo, nextProductCode } = require(path.join(__dirname, "..", "src", "utils", "vehicleSeo"));
const { slugify } = require(path.join(__dirname, "..", "src", "utils", "slugify"));

const VEHICLES = [
  {
    title: "Maruti Dzire Taxi",
    vehicleName: "Maruti Dzire",
    brand: "Maruti",
    model: "Dzire",
    variant: "VXI",
    year: 2023,
    type: "Sedan",
    category: "Sedan",
    vendor: "SwiftRide Chennai",
    city: "Chennai",
    seats: 4,
    bags: 2,
    fuelType: "Petrol",
    transmission: "Manual",
    pricePerKm: 14,
    price: 1400,
    startingPrice: 957,
    packages: [
      { packageType: "local_4hr", packageName: "Local 4Hr", includedHours: 4, includedKm: 40, originalPrice: 1200, price: 957, discountPercentage: 20, extraKmRate: 14, extraHourRate: 240 },
      { packageType: "local_8hr", packageName: "Local 8Hr", includedHours: 8, includedKm: 80, originalPrice: 2200, price: 1760, discountPercentage: 20, extraKmRate: 14, extraHourRate: 240 },
      { packageType: "airport_pickup", packageName: "Airport Pickup", includedHours: 3, includedKm: 35, originalPrice: 900, price: 720, discountPercentage: 20, extraKmRate: 14, extraHourRate: 240 },
      { packageType: "one_way", packageName: "One Way Outstation", includedHours: 0, includedKm: 100, originalPrice: 1800, price: 1400, discountPercentage: 22, extraKmRate: 14, extraHourRate: 250 }
    ],
    pickupLocations: ["Chennai Central", "T Nagar", "Anna Nagar", "Chennai Airport"],
    features: ["AC", "GPS", "FastTag", "Music System", "USB Charger", "Sanitized"],
    featured: true,
    recommended: true,
    rating: 4.7,
    stats: { rating: 4.7, totalReviews: 128, completedTrips: 842, totalBookings: 920, views: 5400, wishlistCount: 86 }
  },
  {
    title: "Honda Amaze Taxi",
    vehicleName: "Honda Amaze",
    brand: "Honda",
    model: "Amaze",
    variant: "VX",
    year: 2023,
    type: "Sedan",
    category: "Sedan",
    vendor: "CityCabs Bengaluru",
    city: "Bengaluru",
    seats: 4,
    bags: 2,
    fuelType: "Petrol",
    transmission: "Manual",
    pricePerKm: 15,
    price: 1500,
    startingPrice: 999,
    packages: [
      { packageType: "local_4hr", packageName: "Local 4Hr", includedHours: 4, includedKm: 40, originalPrice: 1250, price: 999, discountPercentage: 20, extraKmRate: 15, extraHourRate: 250 },
      { packageType: "local_8hr", packageName: "Local 8Hr", includedHours: 8, includedKm: 80, originalPrice: 2400, price: 1920, discountPercentage: 20, extraKmRate: 15, extraHourRate: 250 },
      { packageType: "airport_drop", packageName: "Airport Drop", includedHours: 3, includedKm: 35, originalPrice: 950, price: 760, discountPercentage: 20, extraKmRate: 15, extraHourRate: 250 },
      { packageType: "round_trip", packageName: "Round Trip", includedHours: 0, includedKm: 200, originalPrice: 4200, price: 3360, discountPercentage: 20, extraKmRate: 15, extraHourRate: 250 }
    ],
    pickupLocations: ["MG Road", "Indiranagar", "Kempegowda Airport", "Whitefield"],
    features: ["AC", "GPS", "Bottle Water", "Music System", "Phone Charger"],
    recommended: true,
    rating: 4.6,
    stats: { rating: 4.6, totalReviews: 94, completedTrips: 610, totalBookings: 680, views: 3200, wishlistCount: 52 }
  },
  {
    title: "Hyundai Aura Taxi",
    vehicleName: "Hyundai Aura",
    brand: "Hyundai",
    model: "Aura",
    variant: "SX",
    year: 2024,
    type: "Sedan",
    category: "Sedan",
    vendor: "Hyderabad Rides",
    city: "Hyderabad",
    seats: 4,
    bags: 2,
    fuelType: "Petrol",
    transmission: "Manual",
    pricePerKm: 14,
    price: 1450,
    startingPrice: 980,
    packages: [
      { packageType: "local_4hr", packageName: "Local 4Hr", includedHours: 4, includedKm: 40, originalPrice: 1220, price: 980, discountPercentage: 20, extraKmRate: 14, extraHourRate: 245 },
      { packageType: "local_8hr", packageName: "Local 8Hr", includedHours: 8, includedKm: 80, originalPrice: 2300, price: 1840, discountPercentage: 20, extraKmRate: 14, extraHourRate: 245 },
      { packageType: "corporate", packageName: "Corporate Package", includedHours: 10, includedKm: 100, originalPrice: 2800, price: 2240, discountPercentage: 20, extraKmRate: 14, extraHourRate: 245 }
    ],
    pickupLocations: ["HITEC City", "Gachibowli", "Secunderabad", "RGIA Airport"],
    features: ["AC", "GPS", "FastTag", "WiFi", "Sanitized"],
    rating: 4.5,
    stats: { rating: 4.5, totalReviews: 76, completedTrips: 445, totalBookings: 510, views: 2100, wishlistCount: 38 }
  },
  {
    title: "Toyota Etios Taxi",
    vehicleName: "Toyota Etios",
    brand: "Toyota",
    model: "Etios",
    variant: "GD",
    year: 2022,
    type: "Sedan",
    category: "Sedan",
    vendor: "Madurai Travels",
    city: "Madurai",
    seats: 4,
    bags: 2,
    fuelType: "Diesel",
    transmission: "Manual",
    pricePerKm: 13,
    price: 1300,
    startingPrice: 899,
    packages: [
      { packageType: "local_4hr", packageName: "Local 4Hr", includedHours: 4, includedKm: 40, originalPrice: 1100, price: 899, discountPercentage: 18, extraKmRate: 13, extraHourRate: 220 },
      { packageType: "one_way", packageName: "One Way", includedHours: 0, includedKm: 100, originalPrice: 1600, price: 1300, discountPercentage: 19, extraKmRate: 13, extraHourRate: 220 },
      { packageType: "round_trip", packageName: "Round Trip", includedHours: 0, includedKm: 200, originalPrice: 3800, price: 3040, discountPercentage: 20, extraKmRate: 13, extraHourRate: 220 }
    ],
    pickupLocations: ["Madurai Junction", "Meenakshi Temple", "Madurai Airport"],
    features: ["AC", "GPS", "Music System"],
    rating: 4.4,
    stats: { rating: 4.4, totalReviews: 58, completedTrips: 390, totalBookings: 420, views: 1800, wishlistCount: 24 }
  },
  {
    title: "Maruti Ertiga Taxi",
    vehicleName: "Maruti Ertiga",
    brand: "Maruti",
    model: "Ertiga",
    variant: "VXI",
    year: 2023,
    type: "SUV",
    category: "MUV",
    vendor: "Coimbatore Cabs",
    city: "Coimbatore",
    seats: 6,
    bags: 3,
    fuelType: "Petrol",
    transmission: "Manual",
    pricePerKm: 16,
    price: 1800,
    startingPrice: 1199,
    packages: [
      { packageType: "local_4hr", packageName: "Local 4Hr", includedHours: 4, includedKm: 40, originalPrice: 1500, price: 1199, discountPercentage: 20, extraKmRate: 16, extraHourRate: 280 },
      { packageType: "local_8hr", packageName: "Local 8Hr", includedHours: 8, includedKm: 80, originalPrice: 2800, price: 2240, discountPercentage: 20, extraKmRate: 16, extraHourRate: 280 },
      { packageType: "one_way", packageName: "One Way", includedHours: 0, includedKm: 100, originalPrice: 2200, price: 1800, discountPercentage: 18, extraKmRate: 16, extraHourRate: 280 }
    ],
    pickupLocations: ["Coimbatore Junction", "Peelamedu", "Coimbatore Airport"],
    features: ["AC", "GPS", "FastTag", "Child Seat", "Bottle Water"],
    bestseller: true,
    rating: 4.8,
    stats: { rating: 4.8, totalReviews: 142, completedTrips: 720, totalBookings: 810, views: 4100, wishlistCount: 97 }
  },
  {
    title: "Kia Carens Taxi",
    vehicleName: "Kia Carens",
    brand: "Kia",
    model: "Carens",
    variant: "Prestige",
    year: 2024,
    type: "MUV",
    category: "MUV",
    vendor: "SwiftRide Chennai",
    city: "Chennai",
    seats: 6,
    bags: 3,
    fuelType: "Diesel",
    transmission: "Manual",
    pricePerKm: 17,
    price: 1900,
    startingPrice: 1299,
    packages: [
      { packageType: "local_4hr", packageName: "Local 4Hr", includedHours: 4, includedKm: 40, originalPrice: 1620, price: 1299, discountPercentage: 20, extraKmRate: 17, extraHourRate: 300 },
      { packageType: "local_8hr", packageName: "Local 8Hr", includedHours: 8, includedKm: 80, originalPrice: 3000, price: 2400, discountPercentage: 20, extraKmRate: 17, extraHourRate: 300 },
      { packageType: "wedding", packageName: "Wedding Package", includedHours: 12, includedKm: 120, originalPrice: 4500, price: 3600, discountPercentage: 20, extraKmRate: 17, extraHourRate: 300 }
    ],
    pickupLocations: ["T Nagar", "Velachery", "OMR", "Chennai Airport"],
    features: ["AC", "GPS", "FastTag", "Music System", "USB Charger", "Sanitized"],
    featured: true,
    rating: 4.7,
    stats: { rating: 4.7, totalReviews: 88, completedTrips: 520, totalBookings: 590, views: 2900, wishlistCount: 64 }
  },
  {
    title: "Toyota Innova Crysta Taxi",
    vehicleName: "Toyota Innova Crysta",
    brand: "Toyota",
    model: "Innova Crysta",
    variant: "GX",
    year: 2023,
    type: "SUV",
    category: "Premium MUV",
    vendor: "Premium Fleet Chennai",
    city: "Chennai",
    seats: 7,
    bags: 4,
    fuelType: "Diesel",
    transmission: "Manual",
    pricePerKm: 18,
    price: 2200,
    startingPrice: 1499,
    packages: [
      { packageType: "local_4hr", packageName: "Local 4Hr", includedHours: 4, includedKm: 40, originalPrice: 1875, price: 1499, discountPercentage: 20, extraKmRate: 18, extraHourRate: 350 },
      { packageType: "local_8hr", packageName: "Local 8Hr", includedHours: 8, includedKm: 80, originalPrice: 3500, price: 2800, discountPercentage: 20, extraKmRate: 18, extraHourRate: 350 },
      { packageType: "airport_pickup", packageName: "Airport Pickup", includedHours: 3, includedKm: 35, originalPrice: 1200, price: 960, discountPercentage: 20, extraKmRate: 18, extraHourRate: 350 },
      { packageType: "one_way", packageName: "One Way", includedHours: 0, includedKm: 100, originalPrice: 2600, price: 2200, discountPercentage: 15, extraKmRate: 18, extraHourRate: 350 }
    ],
    pickupLocations: ["Chennai Central", "Adyar", "Tambaram", "Chennai Airport"],
    features: ["AC", "GPS", "FastTag", "Bottle Water", "WiFi", "Child Seat"],
    featured: true,
    recommended: true,
    bestseller: true,
    rating: 4.9,
    stats: { rating: 4.9, totalReviews: 210, completedTrips: 1120, totalBookings: 1250, views: 8900, wishlistCount: 180 }
  },
  {
    title: "Toyota Innova Hycross Taxi",
    vehicleName: "Toyota Innova Hycross",
    brand: "Toyota",
    model: "Innova Hycross",
    variant: "Hybrid ZX",
    year: 2024,
    type: "SUV",
    category: "Premium MUV",
    vendor: "Premium Fleet Chennai",
    city: "Chennai",
    seats: 7,
    bags: 4,
    fuelType: "Hybrid",
    transmission: "Automatic",
    pricePerKm: 20,
    price: 2500,
    startingPrice: 1699,
    packages: [
      { packageType: "local_4hr", packageName: "Local 4Hr", includedHours: 4, includedKm: 40, originalPrice: 2125, price: 1699, discountPercentage: 20, extraKmRate: 20, extraHourRate: 400 },
      { packageType: "local_8hr", packageName: "Local 8Hr", includedHours: 8, includedKm: 80, originalPrice: 4000, price: 3200, discountPercentage: 20, extraKmRate: 20, extraHourRate: 400 },
      { packageType: "corporate", packageName: "Corporate", includedHours: 10, includedKm: 100, originalPrice: 3800, price: 3040, discountPercentage: 20, extraKmRate: 20, extraHourRate: 400 }
    ],
    pickupLocations: ["OMR", "ECR", "Anna Nagar", "Chennai Airport"],
    features: ["AC", "GPS", "FastTag", "WiFi", "USB Charger", "Sanitized", "Child Seat"],
    recommended: true,
    rating: 4.8,
    stats: { rating: 4.8, totalReviews: 156, completedTrips: 680, totalBookings: 740, views: 5200, wishlistCount: 112 }
  },
  {
    title: "Force Tempo Traveller 12 Seater",
    vehicleName: "Force Tempo Traveller 12 Seater",
    brand: "Force",
    model: "Tempo Traveller",
    variant: "12 Seater",
    year: 2022,
    type: "Tempo Traveller",
    category: "Tempo Traveller",
    vendor: "Group Travel Coimbatore",
    city: "Coimbatore",
    seats: 12,
    bags: 8,
    fuelType: "Diesel",
    transmission: "Manual",
    pricePerKm: 22,
    price: 3200,
    startingPrice: 2499,
    packages: [
      { packageType: "local_8hr", packageName: "Local 8Hr", includedHours: 8, includedKm: 80, originalPrice: 3200, price: 2499, discountPercentage: 22, extraKmRate: 22, extraHourRate: 450 },
      { packageType: "one_way", packageName: "One Way", includedHours: 0, includedKm: 100, originalPrice: 3800, price: 3200, discountPercentage: 16, extraKmRate: 22, extraHourRate: 450 },
      { packageType: "round_trip", packageName: "Round Trip", includedHours: 0, includedKm: 250, originalPrice: 7500, price: 6000, discountPercentage: 20, extraKmRate: 22, extraHourRate: 450 }
    ],
    pickupLocations: ["Coimbatore Junction", "Gandhipuram", "Pollachi Road"],
    features: ["AC", "GPS", "Music System", "Bottle Water"],
    rating: 4.5,
    stats: { rating: 4.5, totalReviews: 67, completedTrips: 340, totalBookings: 380, views: 2400, wishlistCount: 41 }
  },
  {
    title: "Force Tempo Traveller 17 Seater",
    vehicleName: "Force Tempo Traveller 17 Seater",
    brand: "Force",
    model: "Tempo Traveller",
    variant: "17 Seater",
    year: 2023,
    type: "Tempo Traveller",
    category: "Tempo Traveller",
    vendor: "Group Travel Bengaluru",
    city: "Bengaluru",
    seats: 17,
    bags: 12,
    fuelType: "Diesel",
    transmission: "Manual",
    pricePerKm: 24,
    price: 3800,
    startingPrice: 2999,
    packages: [
      { packageType: "local_8hr", packageName: "Local 8Hr", includedHours: 8, includedKm: 80, originalPrice: 3800, price: 2999, discountPercentage: 21, extraKmRate: 24, extraHourRate: 500 },
      { packageType: "one_way", packageName: "One Way", includedHours: 0, includedKm: 100, originalPrice: 4500, price: 3800, discountPercentage: 16, extraKmRate: 24, extraHourRate: 500 },
      { packageType: "wedding", packageName: "Wedding Group", includedHours: 12, includedKm: 150, originalPrice: 6500, price: 5200, discountPercentage: 20, extraKmRate: 24, extraHourRate: 500 }
    ],
    pickupLocations: ["Majestic", "Electronic City", "Kempegowda Airport", "Yelahanka"],
    features: ["AC", "GPS", "FastTag", "Music System", "Wheelchair"],
    wheelchairAccessible: true,
    bestseller: true,
    rating: 4.6,
    stats: { rating: 4.6, totalReviews: 82, completedTrips: 290, totalBookings: 330, views: 1900, wishlistCount: 55 }
  }
];

function buildDoc(raw, index, productCode) {
  const slug = slugify(`${raw.vehicleName}-${raw.city}`);
  const synced = syncVehiclePricing(raw);
  const seo = applyVehicleSeo({ ...raw, ...synced, slug, productCode });
  return {
    ...raw,
    slug,
    productCode,
    cabId: productCode,
    images: [],
    image: "",
    gallery: [],
    packages: synced.packages,
    farePackages: synced.farePackages,
    farePackageLabels: synced.farePackageLabels,
    startingPrice: synced.startingPrice,
    pricePerKm: synced.pricePerKm,
    pricePerHour: Math.round((synced.packages.find((p) => p.packageType === "local_4hr")?.price || synced.startingPrice) / 4),
    seoTitle: seo.seoTitle,
    seoDescription: seo.seoDescription,
    seo: seo.seo,
    metaKeywords: seo.metaKeywords,
    schemaEnabled: true,
    faq: [
      { question: `What is the starting price for ${raw.vehicleName} in ${raw.city}?`, answer: `Packages start from ₹${synced.startingPrice.toLocaleString("en-IN")} with verified drivers on Cabzii.` },
      { question: "Are tolls and parking included?", answer: "Tolls and parking are billed separately unless mentioned in your package." }
    ],
    breadcrumb: `Home > Cabs > ${raw.city} > ${raw.vehicleName}`,
    reviewCount: raw.stats?.totalReviews || 0,
    ac: true,
    airCondition: true,
    gps: raw.features.includes("GPS"),
    fastTag: raw.features.includes("FastTag"),
    musicSystem: raw.features.includes("Music System"),
    charger: raw.features.some((f) => f.includes("Charger")),
    bottledWater: raw.features.includes("Bottle Water"),
    childSeat: raw.features.includes("Child Seat"),
    wheelchairAccessible: raw.features.includes("Wheelchair"),
    status: "active",
    sortOrder: index
  };
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Missing MONGODB_URI");
    process.exit(1);
  }
  const append = process.argv.includes("--append");

  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  if (!append) {
    const slugs = VEHICLES.map((v) => slugify(`${v.vehicleName}-${v.city}`));
    const deleted = await Cab.deleteMany({ slug: { $in: slugs } });
    console.log(`Removed ${deleted.deletedCount} existing seed vehicles`);
  }

  let codeNum = 0;
  const last = await Cab.findOne({ productCode: /^CAB\d+$/i }).sort({ productCode: -1 }).select("productCode").lean();
  if (last?.productCode) {
    const m = String(last.productCode).match(/CAB(\d+)/i);
    if (m) codeNum = parseInt(m[1], 10);
  }

  const docs = [];
  for (let i = 0; i < VEHICLES.length; i++) {
    codeNum += 1;
    const productCode = `CAB${String(codeNum).padStart(6, "0")}`;
    docs.push(buildDoc(VEHICLES[i], i, productCode));
  }

  const inserted = [];
  for (const doc of docs) {
    try {
      const row = await Cab.create(doc);
      inserted.push(row);
    } catch (err) {
      console.warn(`Skip ${doc.slug}: ${err.message}`);
    }
  }
  console.log(`Inserted ${inserted.length} vehicles with dynamic packages`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
