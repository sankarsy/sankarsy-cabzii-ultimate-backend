"use strict";

/**
 * Publish Kanchipuram as a live CMS city (no airport product).
 * Usage: node scripts/publishKanchipuram.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const { City } = require("../src/models/City");
const { SeoCityPage } = require("../src/models/SeoCityPage");
const { SiteSettings } = require("../src/models/SiteSettings");

const SLUG = "kanchipuram";
const NAME = "Kanchipuram";

const cabPage = {
  pageType: "cab-booking",
  citySlug: SLUG,
  seoTitle: "Cab Booking in Kanchipuram | Call Taxi Online | Cabzii",
  seoDescription:
    "Book Kanchipuram call taxi and cab booking on Cabzii. Kamakshi, silk streets and Chennai one-way. Tolls extra.",
  seo: "cab booking kanchipuram, kanchipuram call taxi, kanchipuram taxi, outstation cab kanchipuram, cabzii",
  h1: "Cab Booking in Kanchipuram",
  lead: "Book a Cabzii cab in Kanchipuram for temple circuits, silk-street stops and the Chennai highway. Local hourly packages and outstation fares show before you pay. There is no Kanchipuram airport taxi — air arrivals use Chennai (MAA).",
  aboutCity:
    "Kanchipuram is a silk-and-temple day trip from Chennai: Kamakshi Amman, Ekambareswarar and Varadaraja Perumal. There is no local airport — MAA is the air gateway. Same-day 8-hour packages from Chennai sell better than overnight stays except festival weeks.",
  body: "",
  faqs: [
    {
      question: "Is there an airport taxi in Kanchipuram?",
      answer:
        "No. Kanchipuram has no commercial passenger airport. Fly into Chennai (MAA), then book a Chennai airport taxi or a Chennai–Kanchipuram outstation cab."
    },
    {
      question: "How do I book a cab in Kanchipuram?",
      answer:
        "Use the form on this page. Enter pickup and drop, choose local or outstation, compare vehicles, then confirm. Tolls extra unless listed."
    },
    {
      question: "What local packages work for temple days?",
      answer:
        "Multi-stop temple and silk-street days usually fit a 4 hour / 40 km or 8 hour / 80 km local package. Extra km and extra hour rates show on the live fare."
    }
  ],
  touristPlaces: [
    { title: "Kamakshi Amman", body: "Temple-side pickup. Combine with other town shrines on a local package." },
    { title: "Ekambareswarar", body: "Old-town shrine stop. Share the gopuram landmark as pickup or drop." },
    { title: "Varadaraja Perumal", body: "Vishnu temple on the east side. Treat as a local hop, not an all-day stand unless you book hourly." },
    { title: "Silk streets", body: "Shopping loops with waiting time. Book a local package if you have several stops." }
  ],
  popularLocations: ["Kamakshi Temple", "Ekambareswarar", "Varadaraja Perumal", "Silk streets", "Kanchi Mutt", "Bus stand"],
  airportDetails: "No commercial passenger airport. Nearest air gateway is Chennai International Airport (MAA).",
  published: true
};

const actingPage = {
  pageType: "acting-driver",
  citySlug: SLUG,
  seoTitle: "Acting Driver in Kanchipuram | Call Driver | Cabzii",
  seoDescription:
    "Hire an acting driver in Kanchipuram for your own car — temple circuits and Chennai highway days. Same Call Driver packages. No local airport taxi.",
  seo: "acting driver kanchipuram, call driver kanchipuram, driver on hire kanchipuram, temple chauffeur kanchipuram",
  h1: "Acting Driver in Kanchipuram | Cabzii Call Driver",
  lead: "Book a professional to drive your car in Kanchipuram. Same Call Driver packages — local, outstation, monthly quote, corporate and valet. There is no Kanchipuram airport taxi.",
  aboutCity:
    "Acting driver in Kanchipuram is a chauffeur for your own car around Kamakshi Amman, Ekambareswarar, Varadaraja Perumal and the silk streets. Air arrivals use Chennai (MAA). Local 3-hour minimum. Cabzii assigns a driver after you confirm.",
  faqs: [
    {
      question: "Is acting driver in Kanchipuram an airport taxi?",
      answer:
        "No. It is a chauffeur in your own car. Kanchipuram has no commercial airport. For a Cabzii vehicle, book cab booking Kanchipuram or a Chennai cab from MAA."
    },
    {
      question: "How do I book an acting driver in Kanchipuram?",
      answer:
        "Open this page, pick a Call Driver package (local, outstation, monthly quote, corporate or valet), then continue to Call Driver book. Cabzii assigns a professional after you confirm."
    }
  ],
  touristPlaces: [
    { title: "Kamakshi Temple", body: "Temple-side local hours in your car. Share the gopuram or hotel landmark as pickup." },
    { title: "Silk streets / Bus stand", body: "Town pickup for shopping and multi-temple days." },
    { title: "Outstation to Chennai", body: "Outstation Call Driver in your car for the ~75 km highway day." }
  ],
  popularLocations: ["Kamakshi Temple", "Silk streets", "Bus stand", "Ekambareswarar"],
  published: true
};

const serviceSnippets = {
  "/services/outstation-cab/kanchipuram": {
    h1: "Outstation Cab in Kanchipuram",
    productName: "Outstation Cab in Kanchipuram",
    seoTitle: "Outstation Cab Kanchipuram | Book Online | Cabzii",
    seoDescription:
      "Book outstation cabs from Kanchipuram to Chennai, Tirupati and Tamil Nadu towns. AC cars, fares before you pay. Tolls extra.",
    seoKeywords: "outstation cab kanchipuram, kanchipuram to chennai cab, kanchipuram taxi, cabzii",
    intro: "Outstation from Kanchipuram uses the live booking engine — not a separate airport page."
  },
  "/services/one-way-cab/kanchipuram": {
    h1: "One-Way Cab in Kanchipuram",
    productName: "One-Way Cab in Kanchipuram",
    seoTitle: "One-Way Cab Kanchipuram | Book Online | Cabzii",
    seoDescription:
      "Book one-way cabs from Kanchipuram. Inter-city drops without a return charge mix-up. Tolls extra.",
    seoKeywords: "one way cab kanchipuram, kanchipuram one way taxi, cabzii",
    intro: "One-way drops from Kanchipuram to Chennai and nearby cities."
  },
  "/services/tempo-traveller/kanchipuram": {
    h1: "Tempo Traveller in Kanchipuram",
    productName: "Tempo Traveller in Kanchipuram",
    seoTitle: "Tempo Traveller Kanchipuram | Book Online | Cabzii",
    seoDescription:
      "Book a tempo traveller in Kanchipuram for family temple circuits and group outstation trips. Tolls extra.",
    seoKeywords: "tempo traveller kanchipuram, 12 seater kanchipuram, group cab kanchipuram, cabzii",
    intro: "Group temple days and family highway trips from Kanchipuram."
  },
  "/cab-booking/kanchipuram": {
    h1: cabPage.h1,
    productName: cabPage.h1,
    seoTitle: cabPage.seoTitle,
    seoDescription: cabPage.seoDescription,
    seoKeywords: cabPage.seo,
    intro: cabPage.lead
  },
  "/acting-driver/kanchipuram": {
    h1: actingPage.h1,
    productName: actingPage.h1,
    seoTitle: actingPage.seoTitle,
    seoDescription: actingPage.seoDescription,
    seoKeywords: actingPage.seo,
    intro: actingPage.lead
  }
};

async function upsertCity() {
  const payload = {
    name: NAME,
    slug: SLUG,
    cityId: SLUG,
    state: "Tamil Nadu",
    country: "India",
    isActive: true,
    sortOrder: 16,
    description: cabPage.aboutCity,
    content: cabPage.aboutCity,
    airportDetails: cabPage.airportDetails,
    popularLocations: cabPage.popularLocations,
    services: {
      cabBooking: true,
      airportTaxi: false,
      actingDriver: true,
      holidayTrips: true
    }
  };
  const existing =
    (await City.findOne({ slug: SLUG })) ||
    (await City.findOne({ cityId: SLUG })) ||
    (await City.findOne({ name: new RegExp(`^${NAME}$`, "i") }));
  if (existing) {
    await City.updateOne({ _id: existing._id }, { $set: payload });
    console.log("City updated:", SLUG);
    return;
  }
  await City.collection.insertOne({ ...payload, createdAt: new Date(), updatedAt: new Date() });
  console.log("City created:", SLUG);
}

async function upsertCityPage(page) {
  await SeoCityPage.findOneAndUpdate(
    { pageType: page.pageType, citySlug: page.citySlug },
    { $set: page },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log("SeoCityPage:", page.pageType, page.citySlug);
}

async function mergePageSeo() {
  const settings = await SiteSettings.findOne({ key: "main" });
  if (!settings) {
    console.log("No site settings document — skipped pageSeo overlays.");
    return;
  }
  const pageSeo = { ...(settings.pageSeo || {}), ...serviceSnippets };
  settings.pageSeo = pageSeo;
  settings.markModified("pageSeo");
  await settings.save();
  console.log("pageSeo overlays:", Object.keys(serviceSnippets).join(", "));
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Missing MONGODB_URI");
    process.exit(1);
  }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000 });
  await upsertCity();
  await upsertCityPage(cabPage);
  await upsertCityPage(actingPage);
  await mergePageSeo();
  await mongoose.disconnect();
  console.log("Kanchipuram published (no airport).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
