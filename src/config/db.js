const mongoose = require("mongoose");
const { env } = require("./env");

async function connectDb() {
  const uri = env.mongodbUri;
  if (/mongodb\+srv:\/\/[^@]+@f62xoll\.mongodb\.net/i.test(uri)) {
    throw new Error(
      'Invalid MONGODB_URI: use your full Atlas host (e.g. cluster0.xxxxx.mongodb.net) or the 3-shard connection string from Atlas — not "@f62xoll.mongodb.net" alone.'
    );
  }
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 15000,
    maxPoolSize: 10
  });
  console.log("MongoDB connected");
}

module.exports = { connectDb };
