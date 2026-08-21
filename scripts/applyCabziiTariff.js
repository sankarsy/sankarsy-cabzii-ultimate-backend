"use strict";

/**
 * Apply Cabzii published tariff onto existing Cab records.
 * Updates matched vehicles; creates only missing models/variants.
 * Preserves images, SEO, slugs, IDs, vendor, city, availability.
 *
 * Usage: node scripts/applyCabziiTariff.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const path = require("path");
const { Cab } = require(path.join(__dirname, "..", "src", "models", "Cab"));
const { syncVehiclePricing } = require(path.join(__dirname, "..", "src", "utils", "vehiclePackages"));
const { applyVehicleSeo, nextProductCode } = require(path.join(__dirname, "..", "src", "utils", "vehicleSeo"));
const { slugify } = require(path.join(__dirname, "..", "src", "utils", "slugify"));
const { TARIFF, cabMatchesTariff } = require("./cabziiTariff");

function startingFrom(packages) {
  const prices = (packages || []).map((p) => Number(p.price)).filter((n) => n > 0);
  return prices.length ? Math.min(...prices) : 0;
}

function tokenKey(row) {
  return `${(row.tokens || []).join("|")}::${(row.exclude || []).join("|")}`;
}

function pricingPatch(row) {
  const packages = row.packages;
  const synced = syncVehiclePricing({ packages, price: startingFrom(packages), pricePerKm: row.pricePerKm });
  const start = synced.startingPrice || startingFrom(packages);
  return {
    packages: synced.packages,
    farePackages: synced.farePackages,
    farePackageLabels: synced.farePackageLabels,
    driverAllowance: row.driverAllowance,
    pricePerKm: row.pricePerKm,
    extraHourRate: row.extraHourRate || 0,
    startingPrice: start,
    price: row.packages.find((p) => p.packageType === "one_way")?.price || start,
    originalPrice: start,
    discountPercentage: 0,
    hourlyRate: 0,
    dayRate: packages.find((p) => p.includedHours === 8)?.price || packages.find((p) => p.includedHours === 10)?.price || 0
  };
}

async function nextCode() {
  return nextProductCode(Cab);
}

async function updateCab(cab, row) {
  const patch = pricingPatch(row);
  const title = cab.title || row.title;
  const vehicleName = cab.vehicleName || row.vehicleName;
  const seo = applyVehicleSeo({
    ...cab,
    ...patch,
    title,
    vehicleName,
    city: cab.city || "Chennai",
    slug: cab.slug
  });
  const enterpriseSeo = {
    ...(cab.enterpriseSeo && typeof cab.enterpriseSeo === "object" ? cab.enterpriseSeo : {}),
    robots: "index,follow"
  };
  await Cab.updateOne(
    { _id: cab._id },
    {
      $set: {
        ...patch,
        title,
        vehicleName,
        brand: cab.brand || row.brand,
        model: cab.model || row.model,
        variant: cab.variant || row.variant || cab.variant,
        type: cab.type || row.type,
        category: cab.category || row.category,
        seats: row.seats,
        driverAllowance: row.driverAllowance,
        seoTitle: cab.seoTitle || seo.seoTitle,
        seoDescription: cab.seoDescription || seo.seoDescription,
        seo: cab.seo || seo.seo,
        metaKeywords: cab.metaKeywords || seo.metaKeywords,
        schemaEnabled: cab.schemaEnabled !== false,
        enterpriseSeo,
        status: cab.status === "inactive" ? cab.status : "active",
        isDeleted: false
      }
    }
  );
}

async function createCab(row, index) {
  const city = "Chennai";
  const slug = slugify(`${row.vehicleName}-${city}`);
  const exists = await Cab.findOne({ slug }).select("_id").lean();
  const finalSlug = exists ? slugify(`${row.vehicleName}-${row.seats}-${city}`) : slug;
  const productCode = await nextCode();
  const patch = pricingPatch(row);
  const raw = {
    title: row.title,
    vehicleName: row.vehicleName,
    brand: row.brand,
    model: row.model,
    variant: row.variant || "",
    type: row.type,
    category: row.category,
    vendor: "Cabzii Partner",
    city,
    seats: row.seats,
    bags: row.seats >= 12 ? 8 : 2,
    fuelType: row.seats >= 12 ? "Diesel" : "Petrol",
    transmission: "Manual",
    ac: true,
    airCondition: true,
    fuelIncluded: true,
    status: "active",
    isDeleted: false,
    featured: ["swift-dzire-4", "crysta-7", "ertiga-6"].includes(row.key),
    pickupLocations: ["Chennai Airport", "Chennai Central", "T Nagar", "Anna Nagar"],
    features: ["AC", "GPS", "FastTag", "Music System", "Sanitized"],
    slug: finalSlug,
    productCode,
    cabId: productCode,
    images: [],
    image: "",
    gallery: [],
    ...patch,
    schemaEnabled: true,
    enterpriseSeo: { robots: "index,follow", state: "Tamil Nadu" }
  };
  const seo = applyVehicleSeo(raw);
  raw.seoTitle = seo.seoTitle;
  raw.seoDescription = seo.seoDescription;
  raw.seo = seo.seo;
  raw.metaKeywords = seo.metaKeywords;
  raw.breadcrumb = `Home > Cabs > ${city} > ${row.vehicleName}`;
  raw.faq = [
    {
      question: `What is the ${row.vehicleName} rental tariff in ${city}?`,
      answer: `Packages start from ₹${Number(patch.startingPrice).toLocaleString("en-IN")}. Extra km, extra hour and driver batta follow the Cabzii tariff.`
    },
    {
      question: "Are tolls and parking included?",
      answer: "Tariff includes fuel and driver service only. Toll, parking and entry fees are extra."
    }
  ];
  void index;
  const created = await Cab.create(raw);
  return created;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Missing MONGODB_URI");
    process.exit(1);
  }
  await mongoose.connect(uri);
  const cabs = await Cab.find({}).lean();
  const claimed = new Set();
  const report = { updated: [], created: [], alreadyExisted: [], skippedNotInTariff: [] };

  const byKey = {};
  for (const row of TARIFF) {
    const key = tokenKey(row);
    byKey[key] = byKey[key] || [];
    byKey[key].push(row);
  }

  for (const row of TARIFF) {
    const group = byKey[tokenKey(row)];
    const matches = cabs.filter((cab) => !claimed.has(String(cab._id)) && cabMatchesTariff(cab, row));
    const exactSeats = matches.filter((cab) => Number(cab.seats) === row.seats);

    if (exactSeats.length) {
      for (const cab of exactSeats) {
        await updateCab(cab, row);
        claimed.add(String(cab._id));
        report.updated.push({ key: row.key, id: String(cab._id), slug: cab.slug, title: cab.title || row.title });
      }
      report.alreadyExisted.push(row.key);
      continue;
    }

    if (group.length === 1 && matches.length) {
      for (const cab of matches) {
        await updateCab(cab, row);
        claimed.add(String(cab._id));
        report.updated.push({
          key: row.key,
          id: String(cab._id),
          slug: cab.slug,
          title: cab.title || row.title,
          seatsAdjusted: cab.seats !== row.seats
        });
      }
      report.alreadyExisted.push(row.key);
      continue;
    }

    const unseated = matches.filter((cab) => cab.seats == null);
    if (unseated.length) {
      const cab = unseated[0];
      await updateCab(cab, row);
      claimed.add(String(cab._id));
      report.updated.push({ key: row.key, id: String(cab._id), slug: cab.slug, title: cab.title || row.title });
      report.alreadyExisted.push(row.key);
      continue;
    }

    const created = await createCab(row, report.created.length);
    cabs.push(created.toObject());
    claimed.add(String(created._id));
    report.created.push({ key: row.key, id: String(created._id), slug: created.slug, title: created.title });
  }

  for (const cab of cabs) {
    if (claimed.has(String(cab._id))) continue;
    report.skippedNotInTariff.push({
      id: String(cab._id),
      slug: cab.slug,
      title: cab.title || cab.vehicleName || "(untitled)"
    });
  }

  console.log(JSON.stringify(report, null, 2));
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
