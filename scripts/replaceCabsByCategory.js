"use strict";

/**
 * Retire the current cab catalog and replace it with category groups.
 * Hatchback and Sedan are category cards, not one card per model.
 * Hatchback lists Wagon R. Sedan lists Tour S, Xpress-T and Etios.
 * Sedan Premium lists Ciaz and Verna.
 * MPV: Ertiga, Xylo, XL6. SUV: Innova, Innova Crysta.
 * Van: Force Traveller 9+1 through 20+1, Urbania 10+1, 13+1, 17+1.
 * Does not write product SEO fields.
 *
 * Usage: node scripts/replaceCabsByCategory.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const path = require("path");
const { Cab } = require(path.join(__dirname, "..", "src", "models", "Cab"));
const { syncVehiclePricing } = require(path.join(__dirname, "..", "src", "utils", "vehiclePackages"));
const { nextProductCode } = require(path.join(__dirname, "..", "src", "utils", "vehicleSeo"));
const { TARIFF } = require("./cabziiTariff");

function byKey(key) {
  const row = TARIFF.find((item) => item.key === key);
  if (!row) throw new Error(`Missing tariff row ${key}`);
  return row;
}

function clonePackages(key) {
  return JSON.parse(JSON.stringify(byKey(key).packages));
}

function withPrices(packages, prices) {
  return packages.map((pkg) => {
    const next = prices[pkg.packageType];
    if (!next) return pkg;
    return {
      ...pkg,
      price: next.price,
      originalPrice: next.price,
      extraKmRate: next.extraKm,
      extraHourRate: next.extraHour
    };
  });
}

const dzirePackages = clonePackages("swift-dzire-4");

function model({ slug, name, category, seats, bags, fuelType, brand, tariffKey, packages, pricePerKm, extraHourRate, driverAllowance, featured, examples }) {
  const source = tariffKey ? byKey(tariffKey) : null;
  return {
    slug,
    name,
    category,
    seats,
    bags,
    fuelType,
    brand,
    packages: packages || clonePackages(tariffKey),
    pricePerKm: pricePerKm ?? source.pricePerKm,
    extraHourRate: extraHourRate ?? source.extraHourRate,
    driverAllowance: driverAllowance ?? source.driverAllowance,
    featured: Boolean(featured),
    examples: examples || ""
  };
}

const hatchPackages = withPrices(dzirePackages, {
  local_4hr: { price: 1100, extraKm: 14, extraHour: 200 },
  local_8hr: { price: 2200, extraKm: 14, extraHour: 200 },
  one_way: { price: 3000, extraKm: 14, extraHour: 200 },
  round_trip: { price: 3000, extraKm: 14, extraHour: 200 }
});
const ertigaPackages = clonePackages("ertiga-6");

const CATALOG = [
  model({
    slug: "hatchback",
    name: "Hatchback",
    category: "Hatchback",
    seats: 4,
    bags: 2,
    fuelType: "Petrol",
    brand: "",
    packages: hatchPackages,
    pricePerKm: 14,
    extraHourRate: 200,
    driverAllowance: 600,
    featured: true,
    examples: "Wagon R"
  }),
  model({
    slug: "sedan",
    name: "Sedan",
    category: "Sedan",
    seats: 4,
    bags: 3,
    fuelType: "Diesel",
    brand: "",
    tariffKey: "swift-dzire-4",
    featured: true,
    examples: "Tour S, Xpress-T, Etios"
  }),
  model({
    slug: "sedan-premium",
    name: "Sedan Premium",
    category: "Sedan Premium",
    seats: 4,
    bags: 3,
    fuelType: "Petrol",
    brand: "",
    tariffKey: "honda-amaze-4",
    featured: true,
    examples: "Ciaz, Verna"
  }),
  model({
    slug: "ertiga",
    name: "Ertiga",
    category: "MPV",
    seats: 6,
    bags: 4,
    fuelType: "Petrol",
    brand: "Maruti Suzuki",
    tariffKey: "ertiga-6",
    featured: true
  }),
  model({
    slug: "xylo",
    name: "Xylo",
    category: "MPV",
    seats: 7,
    bags: 4,
    fuelType: "Diesel",
    brand: "Mahindra",
    packages: JSON.parse(JSON.stringify(ertigaPackages)),
    pricePerKm: 19,
    extraHourRate: 450,
    driverAllowance: 600
  }),
  model({
    slug: "xl6",
    name: "XL6",
    category: "MPV",
    seats: 6,
    bags: 4,
    fuelType: "Petrol",
    brand: "Maruti Suzuki",
    tariffKey: "kia-carens-7"
  }),
  model({
    slug: "innova",
    name: "Innova",
    category: "SUV",
    seats: 7,
    bags: 4,
    fuelType: "Diesel",
    brand: "Toyota",
    tariffKey: "innova-7"
  }),
  model({
    slug: "innova-crysta",
    name: "Innova Crysta",
    category: "SUV",
    seats: 7,
    bags: 4,
    fuelType: "Diesel",
    brand: "Toyota",
    tariffKey: "crysta-7",
    featured: true
  }),
  model({
    slug: "force-traveller-9-1",
    name: "Force Traveller 9+1",
    category: "Van",
    seats: 9,
    bags: 6,
    fuelType: "Diesel",
    brand: "Force",
    tariffKey: "tempo-12"
  }),
  model({
    slug: "force-traveller-12-1",
    name: "Force Traveller 12+1",
    category: "Van",
    seats: 12,
    bags: 8,
    fuelType: "Diesel",
    brand: "Force",
    tariffKey: "tempo-12"
  }),
  model({
    slug: "force-traveller-13-1",
    name: "Force Traveller 13+1",
    category: "Van",
    seats: 13,
    bags: 8,
    fuelType: "Diesel",
    brand: "Force",
    tariffKey: "tempo-13"
  }),
  model({
    slug: "force-traveller-17-1",
    name: "Force Traveller 17+1",
    category: "Van",
    seats: 17,
    bags: 10,
    fuelType: "Diesel",
    brand: "Force",
    tariffKey: "tempo-18"
  }),
  model({
    slug: "force-traveller-20-1",
    name: "Force Traveller 20+1",
    category: "Van",
    seats: 20,
    bags: 10,
    fuelType: "Diesel",
    brand: "Force",
    tariffKey: "minibus-21"
  }),
  model({
    slug: "urbania-10-1",
    name: "Urbania 10+1",
    category: "Van",
    seats: 10,
    bags: 8,
    fuelType: "Diesel",
    brand: "Force",
    tariffKey: "luxury-tempo-14"
  }),
  model({
    slug: "urbania-13-1",
    name: "Urbania 13+1",
    category: "Van",
    seats: 13,
    bags: 8,
    fuelType: "Diesel",
    brand: "Force",
    tariffKey: "luxury-tempo-14"
  }),
  model({
    slug: "urbania-17-1",
    name: "Urbania 17+1",
    category: "Van",
    seats: 17,
    bags: 10,
    fuelType: "Diesel",
    brand: "Force",
    tariffKey: "luxury-tempo-14"
  })
];

function pricingPatch(row) {
  const synced = syncVehiclePricing({
    packages: row.packages,
    price: 0,
    pricePerKm: row.pricePerKm
  });
  const start = synced.startingPrice || 0;
  const oneWay = row.packages.find((pkg) => pkg.packageType === "one_way");
  return {
    packages: synced.packages,
    farePackages: synced.farePackages,
    farePackageLabels: synced.farePackageLabels,
    driverAllowance: row.driverAllowance,
    pricePerKm: row.pricePerKm,
    extraHourRate: row.extraHourRate || 0,
    startingPrice: start,
    price: oneWay?.price || start,
    originalPrice: start,
    discountPercentage: 0,
    hourlyRate: 0,
    dayRate: row.packages.find((pkg) => pkg.includedHours === 8)?.price || row.packages.find((pkg) => pkg.includedHours === 10)?.price || 0
  };
}

function documentFor(row) {
  return {
    title: row.name,
    vehicleName: row.name,
    vehicleModel: row.name,
    brand: row.brand,
    brandName: row.brand,
    model: row.name,
    variant: "",
    examples: row.examples || "",
    type: row.category,
    category: row.category,
    vendor: "Cabzii Partner",
    city: "Chennai",
    seats: row.seats,
    bags: row.bags,
    fuelType: row.fuelType,
    transmission: "Manual",
    ac: true,
    airCondition: true,
    fuelIncluded: true,
    status: "active",
    isDeleted: false,
    featured: row.featured,
    pickupLocations: ["Chennai Airport", "Chennai Central", "T Nagar", "Anna Nagar"],
    features: ["AC", "GPS", "FastTag", "Music System", "Sanitized"],
    slug: row.slug,
    images: [],
    image: "",
    gallery: [],
    ...pricingPatch(row)
  };
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Missing MONGODB_URI");
    process.exit(1);
  }
  await mongoose.connect(uri);
  const slugs = CATALOG.map((row) => row.slug);
  const retired = await Cab.updateMany(
    { slug: { $nin: slugs }, isDeleted: { $ne: true } },
    { $set: { isDeleted: true, status: "inactive" } }
  );

  let created = 0;
  let updated = 0;
  for (const row of CATALOG) {
    const fields = documentFor(row);
    const existing = await Cab.findOne({ slug: row.slug }).select("_id productCode cabId").lean();
    if (existing) {
      await Cab.updateOne({ _id: existing._id }, { $set: fields });
      updated += 1;
      continue;
    }
    const productCode = await nextProductCode(Cab);
    await Cab.create({ ...fields, productCode, cabId: productCode });
    created += 1;
  }

  const active = await Cab.find({ isDeleted: { $ne: true }, status: "active" })
    .select("category vehicleModel slug")
    .sort({ category: 1, vehicleModel: 1 })
    .lean();
  const groups = {};
  for (const cab of active) {
    const key = cab.category || "Other";
    groups[key] = groups[key] || [];
    groups[key].push(cab.vehicleModel);
  }
  console.log(
    JSON.stringify(
      {
        retired: retired.modifiedCount,
        created,
        updated,
        active: active.length,
        groups
      },
      null,
      2
    )
  );
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error.message || error);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
