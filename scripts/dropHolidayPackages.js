"use strict";

/**
 * Permanently remove holiday / tour-package product data.
 * Does not drop cabs, drivers, buses, or cab fare packages.
 *
 * Usage: node scripts/dropHolidayPackages.js
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const { connectDb } = require("../src/config/db");
const { Offer } = require("../src/models/Offer");
const { SiteSettings } = require("../src/models/SiteSettings");
const { SeoService } = require("../src/models/SeoService");
const { SeoLanding } = require("../src/models/SeoLanding");
const { RelatedContent } = require("../src/models/RelatedContent");
const { Blog } = require("../src/models/Blog");
const { Testimonial } = require("../src/models/Testimonial");
const { Booking } = require("../src/models/Booking");
const { CrmLead } = require("../src/models/CrmLead");

function isHolidayLink(value) {
  const text = `${value?.href || ""} ${value?.label || ""} ${value?.key || ""} ${value?.id || ""} ${value?.title || ""} ${value?.type || ""}`.toLowerCase();
  return /holiday|tour-package|tour package|\/packages\b|key["']?:\s*["']tours/.test(text) || value?.key === "tours" || value?.id === "tour" || value?.id === "holidays";
}

function isHolidayHref(href) {
  return /(holidays|tour-packages|holiday-packages|\/packages)/i.test(String(href || ""));
}

async function dropCollection(db, name) {
  try {
    const n = await db.collection(name).countDocuments();
    await db.collection(name).drop();
    console.log(`Dropped ${name} (${n} docs)`);
  } catch (err) {
    console.log(`${name}: ${err.message}`);
  }
}

async function main() {
  await connectDb();
  const db = mongoose.connection.db;

  await dropCollection(db, "packages");
  await dropCollection(db, "destinations");

  const offerDel = await Offer.deleteMany({
    $or: [
      { href: { $regex: "(holidays|tour-packages|holiday-packages|/packages)" } },
      { title: { $regex: "holiday package|tour package", $options: "i" } }
    ]
  });
  console.log(`Deleted ${offerDel.deletedCount} holiday offer cards`);

  const offerIcon = await Offer.updateMany({ iconKey: "holiday" }, { $set: { iconKey: "route" } });
  console.log(`Remapped ${offerIcon.modifiedCount} holiday icons to route`);

  const settingsCol = SiteSettings.collection;
  const settings = await settingsCol.findOne({ key: "main" });
  if (settings) {
    const hero = { ...(settings.hero || {}) };
    if (Array.isArray(hero.tabs)) {
      hero.tabs = hero.tabs.filter((tab) => tab.id !== "tour" && tab.id !== "holidays");
    }
    if (/tour package/i.test(hero.subtitle || "")) {
      hero.subtitle =
        "Compare sedan, SUV and Innova fares. Airport, local, outstation and acting driver booking with fares shown before you confirm.";
    }
    if (/tour/i.test(hero.searchPlaceholder || "")) {
      hero.searchPlaceholder = "Search cabs, drivers or routes...";
    }
    const pageSeo = { ...(settings.pageSeo || {}) };
    for (const key of Object.keys(pageSeo)) {
      if (isHolidayHref(key)) delete pageSeo[key];
    }
    const homepageBuilder = settings.homepageBuilder ? { ...settings.homepageBuilder } : undefined;
    if (homepageBuilder?.blocks) {
      homepageBuilder.blocks = homepageBuilder.blocks.filter(
        (block) => !isHolidayLink(block) && block.type !== "tours" && block.key !== "tours"
      );
    }
    await settingsCol.updateOne(
      { key: "main" },
      {
        $set: {
          navbar: (settings.navbar || []).filter((row) => !isHolidayLink(row)),
          footerQuickLinks: (settings.footerQuickLinks || []).filter((row) => !isHolidayLink(row)),
          homeSections: (settings.homeSections || []).filter((row) => row.key !== "tours" && !isHolidayLink(row)),
          hero,
          pageSeo,
          ...(homepageBuilder ? { homepageBuilder } : {})
        },
        $unset: { holidayCategories: "" }
      }
    );
    console.log("Stripped holiday data from site settings");
  } else {
    console.log("No site settings document");
  }

  const seoSvc = await SeoService.deleteMany({ slug: { $in: ["tour-packages", "holiday-packages", "holidays"] } });
  console.log(`Deleted ${seoSvc.deletedCount} tour SEO services`);

  const landings = await SeoLanding.deleteMany({
    $or: [
      { slug: { $regex: "holiday|tour-package" } },
      { ctaHref: { $regex: "(holidays|tour-packages|/packages)" } }
    ]
  });
  console.log(`Deleted ${landings.deletedCount} holiday SEO landings`);

  const related = await RelatedContent.deleteMany({
    $or: [
      { sourceType: { $in: ["tour", "destination"] } },
      { relatedType: { $in: ["tour", "destination"] } },
      { sourceSlug: { $regex: "holiday|tour-package" } },
      { relatedSlug: { $regex: "holiday|tour-package" } }
    ]
  });
  console.log(`Deleted ${related.deletedCount} holiday related-content rows`);

  const blogs = await Blog.deleteMany({
    $or: [
      { title: { $regex: "holiday package|pilgrimage circuit|pilgrimage holiday", $options: "i" } },
      { slug: { $regex: "holiday-package|pilgrimage-circuit" } },
      { seo: { $regex: "cabzii holidays|holiday packages", $options: "i" } }
    ]
  });
  console.log(`Deleted ${blogs.deletedCount} holiday blogs`);

  const testimonials = await Testimonial.deleteMany({
    message: { $regex: "holiday package|pilgrimage package|beach package|Holiday and cab booking", $options: "i" }
  });
  console.log(`Deleted ${testimonials.deletedCount} holiday testimonials`);

  const bookings = await Booking.deleteMany({ type: "tour" });
  console.log(`Deleted ${bookings.deletedCount} tour bookings`);

  try {
    const crm = await CrmLead.deleteMany({ productType: "tour" });
    console.log(`Deleted ${crm.deletedCount} holiday CRM leads`);
  } catch (err) {
    console.log(`CRM leads: ${err.message}`);
  }

  try {
    const quoteModel = mongoose.models.QuoteLead || mongoose.connection.collection("quoteleads");
    const quotes = typeof quoteModel.deleteMany === "function"
      ? await quoteModel.deleteMany({ $or: [{ service: "tour" }, { productType: "tour" }] })
      : await db.collection("quoteleads").deleteMany({ $or: [{ service: "tour" }, { productType: "tour" }] });
    console.log(`Deleted ${quotes.deletedCount} holiday quote leads`);
  } catch (err) {
    console.log(`Quote leads: ${err.message}`);
  }

  await mongoose.disconnect();
  console.log("Holiday product data removed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
