const mongoose = require("mongoose");
const { env } = require("./env");

function databaseNameFromMongoUri(uri) {
  try {
    const name = decodeURIComponent(new URL(uri).pathname.replace(/^\//, "").split("/")[0] || "");
    return name.trim();
  } catch {
    return "";
  }
}

async function connectDb() {
  const uri = env.mongodbUri;
  if (/mongodb\+srv:\/\/[^@]+@f62xoll\.mongodb\.net/i.test(uri)) {
    throw new Error(
      'Invalid MONGODB_URI: use your full Atlas host (e.g. cluster0.xxxxx.mongodb.net) or the 3-shard connection string from Atlas — not "@f62xoll.mongodb.net" alone.'
    );
  }
  const dbName = databaseNameFromMongoUri(uri) || process.env.MONGODB_DB_NAME || "cabzii";
  await mongoose.connect(uri, {
    dbName,
    serverSelectionTimeoutMS: 15000,
    maxPoolSize: 10
  });
  console.log(`MongoDB connected (${dbName})`);

  try {
    const { seedPackagesIfEmpty } = require("../utils/seedPackagesIfEmpty");
    await seedPackagesIfEmpty();
  } catch (err) {
    console.warn("Package auto-seed skipped:", err.message);
  }

  try {
    const { seedDriversFromCabsIfEmpty } = require("../utils/seedDriversFromCabs");
    await seedDriversFromCabsIfEmpty();
  } catch (err) {
    console.warn("Driver auto-seed skipped:", err.message);
  }

  try {
    const { seedBusesIfEmpty } = require("../utils/seedBusesIfEmpty");
    await seedBusesIfEmpty();
  } catch (err) {
    console.warn("Bus auto-seed skipped:", err.message);
  }
}

module.exports = { connectDb, databaseNameFromMongoUri };
