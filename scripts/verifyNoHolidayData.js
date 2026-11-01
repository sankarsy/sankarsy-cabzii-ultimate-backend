"use strict";

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const { connectDb } = require("../src/config/db");
const { SiteSettings } = require("../src/models/SiteSettings");
const { Offer } = require("../src/models/Offer");

async function main() {
  await connectDb();
  const settings = await SiteSettings.collection.findOne({ key: "main" });
  console.log("holidayCategories", settings?.holidayCategories);
  console.log(
    "homeSectionKeys",
    (settings?.homeSections || []).map((row) => row.key)
  );
  console.log("heroTabs", settings?.hero?.tabs);
  const holidayOffers = await Offer.find({
    $or: [{ href: { $regex: "holidays|tour-packages" } }, { iconKey: "holiday" }]
  })
    .select("title href iconKey")
    .lean();
  console.log("holidayOffers", holidayOffers.length);
  try {
    console.log("packagesCount", await mongoose.connection.db.collection("packages").countDocuments());
  } catch (err) {
    console.log("packagesCount", err.message);
  }
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
