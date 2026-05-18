const mongoose = require("mongoose");
const { env } = require("./env");

async function connectDb() {
  await mongoose.connect(env.mongodbUri);
  console.log("MongoDB connected");
}

module.exports = { connectDb };
