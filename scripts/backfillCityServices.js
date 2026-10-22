"use strict";

/**
 * Repeatable: ensure every City has a unique slug and default service flags.
 * Does not delete cities or bookings.
 *
 * Usage: node scripts/backfillCityServices.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const { City } = require("../src/models/City");
const { slugify } = require("../src/utils/slugify");

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Missing MONGODB_URI");
    process.exit(1);
  }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000 });
  const cities = await City.find({}).lean();
  let updated = 0;
  const used = new Set();
  for (const city of cities) {
    let slug = slugify(city.slug || city.name);
    if (!slug) slug = String(city._id);
    let unique = slug;
    let n = 2;
    while (used.has(unique)) {
      unique = `${slug}-${n}`;
      n += 1;
    }
    used.add(unique);
    const services = {
      cabBooking: city.services?.cabBooking !== false,
      airportTaxi: city.services?.airportTaxi !== false,
      actingDriver: city.services?.actingDriver !== false,
      holidayTrips: city.services?.holidayTrips !== false
    };
    await City.updateOne(
      { _id: city._id },
      {
        $set: {
          slug: unique,
          services,
          description: city.description || city.content || ""
        }
      }
    );
    updated += 1;
  }
  console.log(`Updated ${updated} cities with slugs and service flags.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
