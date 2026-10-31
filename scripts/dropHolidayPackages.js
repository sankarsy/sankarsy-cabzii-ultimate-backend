"use strict";

const mongoose = require("mongoose");
const { connectDb } = require("../src/config/db");
const { Offer } = require("../src/models/Offer");
const { SiteSettings } = require("../src/models/SiteSettings");

function isHolidayLink(value) {
  const text = `${value?.href || ""} ${value?.label || ""} ${value?.key || ""}`.toLowerCase();
  return /holiday|tour-package|\/packages/.test(text);
}

async function main() {
  await connectDb();
  const db = mongoose.connection.db;
  try {
    const n = await db.collection("packages").countDocuments();
    await db.collection("packages").drop();
    console.log(`Dropped packages collection (${n} docs)`);
  } catch (err) {
    console.log(`Packages collection: ${err.message}`);
  }

  const offerRes = await Offer.updateMany(
    { href: { $regex: "(holidays|tour-packages|/packages)" } },
    { $set: { href: "/chennai/outstation/chennai-to-tirupati", published: false } }
  );
  console.log(`Updated ${offerRes.modifiedCount} offer cards`);

  const settings = await SiteSettings.findOne({ key: "main" });
  if (settings) {
    settings.navbar = (settings.navbar || []).filter((row) => !isHolidayLink(row));
    settings.footerQuickLinks = (settings.footerQuickLinks || []).filter((row) => !isHolidayLink(row));
    settings.homeSections = (settings.homeSections || []).filter((row) => !isHolidayLink(row));
    if (settings.hero && Array.isArray(settings.hero.tabs)) {
      settings.hero.tabs = settings.hero.tabs.filter((tab) => tab.id !== "tour" && tab.id !== "holidays");
    }
    await settings.save();
    console.log("Stripped holiday links from site settings");
  } else {
    console.log("No site settings document");
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
