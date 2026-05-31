"use strict";

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const { City } = require("../src/models/City");
const { Location } = require("../src/models/Location");

/** Pickup / drop points per city — upserted script, safe to re-run. */
const LOCATION_SEEDS = [
  {
    city: { name: "Coimbatore", state: "Tamil Nadu", sortOrder: 2 },
    points: [
      { name: "Coimbatore Junction", address: "Gandhipuram, Coimbatore", pincode: "641018" },
      { name: "Coimbatore International Airport", address: "Peelamedu, Coimbatore", pincode: "641014" },
      { name: "Gandhipuram Bus Stand", address: "Gandhipuram, Coimbatore", pincode: "641012" }
    ]
  },
  {
    city: { name: "Madurai", state: "Tamil Nadu", sortOrder: 3 },
    points: [
      { name: "Madurai Junction", address: "Railway Colony, Madurai", pincode: "625001" },
      { name: "Madurai Airport", address: "Avaniyapuram, Madurai", pincode: "625022" },
      { name: "Meenakshi Temple pickup", address: "East Chithirai Street, Madurai", pincode: "625001" }
    ]
  },
  {
    city: { name: "Tirupati", state: "Andhra Pradesh", sortOrder: 4 },
    points: [
      { name: "Tirupati Railway Station", address: "Tirupati, Andhra Pradesh", pincode: "517501" },
      { name: "Tirupati Bus Stand", address: "Tirupati Central", pincode: "517501" },
      { name: "Tirumala foothills pickup", address: "Alipiri, Tirupati", pincode: "517501" }
    ]
  },
  {
    city: { name: "Bengaluru", state: "Karnataka", sortOrder: 5 },
    points: [
      { name: "Kempegowda International Airport", address: "Devanahalli, Bengaluru", pincode: "560300" },
      { name: "Bengaluru City Railway Station", address: "Kempegowda Road, Bengaluru", pincode: "560023" },
      { name: "Majestic Bus Stand", address: "Gandhi Nagar, Bengaluru", pincode: "560009" },
      { name: "Electronic City", address: "Electronic City Phase 1, Bengaluru", pincode: "560100" }
    ]
  },
  {
    city: { name: "Hyderabad", state: "Telangana", sortOrder: 6 },
    points: [
      { name: "Rajiv Gandhi International Airport", address: "Shamshabad, Hyderabad", pincode: "500409" },
      { name: "Secunderabad Railway Station", address: "Secunderabad, Hyderabad", pincode: "500003" },
      { name: "Hyderabad Deccan (Nampally)", address: "Nampally, Hyderabad", pincode: "500001" }
    ]
  },
  {
    city: { name: "Pondicherry", state: "Puducherry", sortOrder: 7 },
    points: [
      { name: "Pondicherry Bus Stand", address: "Orleanpet, Puducherry", pincode: "605001" },
      { name: "Promenade Beach pickup", address: "Beach Road, Puducherry", pincode: "605001" },
      { name: "Auroville pickup point", address: "Auroville Road, Puducherry", pincode: "605101" }
    ]
  }
];

function toSlug(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function nextCityId() {
  const max = await City.findOne({ cityId: { $exists: true, $ne: null } })
    .sort({ cityId: -1 })
    .lean();
  return (max?.cityId || 0) + 1;
}

async function findOrCreateCity(city) {
  const slug = toSlug(city.name);
  const namePattern = new RegExp(`^${escapeRegex(city.name)}$`, "i");

  let doc = await City.findOne({
    $or: [{ name: namePattern }, { slug }]
  });

  if (doc) {
    const patch = {};
    if (city.state && !doc.state) patch.state = city.state;
    if (doc.isActive === undefined && doc.active !== undefined) patch.isActive = doc.active;
    if (Object.keys(patch).length) {
      await City.updateOne({ _id: doc._id }, { $set: patch });
      doc = await City.findById(doc._id);
    }
    return doc;
  }

  const cityId = await nextCityId();
  const inserted = await City.collection.insertOne({
    name: city.name,
    state: city.state || "",
    country: "India",
    isActive: true,
    sortOrder: city.sortOrder || 0,
    slug,
    cityId,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  return City.findById(inserted.insertedId);
}

async function upsertCity(city) {
  return findOrCreateCity(city);
}

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI required in cabzii-ultimate-backend/.env");

  await mongoose.connect(uri);

  let created = 0;
  for (const entry of LOCATION_SEEDS) {
    const cityDoc = await upsertCity(entry.city);
    const cityName = cityDoc.state
      ? `${String(cityDoc.name).replace(/^./, (c) => c.toUpperCase())}, ${cityDoc.state}`
      : cityDoc.name;

    for (const point of entry.points) {
      await Location.findOneAndUpdate(
        { city: cityDoc._id, name: point.name },
        {
          $set: {
            city: cityDoc._id,
            cityName,
            name: point.name,
            address: point.address || "",
            pincode: point.pincode || "",
            isActive: true
          }
        },
        { upsert: true, new: true }
      );
      created += 1;
    }
  }

  console.log(`Seeded ${created} service locations across ${LOCATION_SEEDS.length} cities.`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
