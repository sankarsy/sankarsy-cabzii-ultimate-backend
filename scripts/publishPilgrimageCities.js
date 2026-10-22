"use strict";

/**
 * Publish Sabarimala and Ayyappan Kovil (no airport).
 * Usage: node scripts/publishPilgrimageCities.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const { City } = require("../src/models/City");
const { SeoCityPage } = require("../src/models/SeoCityPage");
const { SiteSettings } = require("../src/models/SiteSettings");

const CITIES = [
  {
    slug: "sabarimala",
    name: "Sabarimala",
    state: "Kerala",
    sortOrder: 20,
    airportTaxi: false,
    airportDetails:
      "No commercial passenger airport. Cabs drop at Pamba or Nilakkal. Usual air gateways are Cochin (COK) and Madurai (IXM).",
    cab: {
      seoTitle: "Cab Booking Sabarimala | Pamba Taxi | Cabzii",
      seoDescription:
        "Book Sabarimala cabs on Cabzii — Pamba, Nilakkal and Erumeli. No shrine-road taxi. No local airport. Pay 50% to confirm. Tolls extra.",
      seo: "sabarimala taxi, sabarimalai cab, pamba taxi, nilakkal cab, ayyappa temple cab, cabzii sabarimala",
      h1: "Cab Booking in Sabarimala — Pamba and Nilakkal",
      lead: "Book a Cabzii cab to Sabarimala for Pamba or Nilakkal drop. Vehicles do not go to Sannidhanam. There is no Sabarimala airport taxi — air arrivals use Cochin (COK) or Madurai (IXM).",
      aboutCity:
        "Sabarimala Ayyappa shrine is a Kerala pilgrimage. Cabs stop at Pamba or Nilakkal; the last stretch to Sannidhanam is on foot. Mandala–Makaravilakku season fills tempo travellers from Tamil Nadu. There is no local airport — usual gateways are Cochin (COK), Madurai (IXM) and Chengannur railway.",
      faqs: [
        {
          question: "Is there an airport taxi in Sabarimala?",
          answer:
            "No. Sabarimala has no airport. Fly into Cochin (COK) or Madurai (IXM), then book an outstation cab to Pamba or Nilakkal."
        },
        {
          question: "Does the cab go to Sannidhanam?",
          answer:
            "No. Cabzii vehicles stop at Pamba or Nilakkal. The last stretch to Sannidhanam is on foot, per shrine rules."
        },
        {
          question: "How do I book a cab to Sabarimala?",
          answer:
            "Use the form on this page. Enter pickup and Pamba or Nilakkal as drop, compare vehicles, then pay 50% to confirm. Tolls extra unless listed."
        }
      ],
      touristPlaces: [
        { title: "Pamba", body: "Usual cab drop before the trek. Share the parking stand for the return pickup." },
        { title: "Nilakkal", body: "Base parking and bus interchange. Vehicle limit, not a town hop." },
        { title: "Erumeli", body: "Traditional trek start. Book as a stop on the way in." },
        { title: "Chengannur / COK", body: "Rail and air gateways. Book as outstation from this hub." }
      ],
      popularLocations: ["Pamba", "Nilakkal", "Erumeli", "Chengannur"]
    },
    acting: {
      seoTitle: "Acting Driver Sabarimala | Call Driver | Cabzii",
      seoDescription:
        "Hire an acting driver for your own car on the Sabarimala approach — Pamba and Nilakkal. Same Call Driver packages. No local airport taxi.",
      seo: "acting driver sabarimala, call driver sabarimalai, pamba chauffeur, nilakkal acting driver",
      h1: "Acting Driver in Sabarimala | Cabzii Call Driver",
      lead: "Book a professional to drive your car towards Sabarimala. Vehicles stop at Pamba or Nilakkal. There is no Sabarimala airport taxi.",
      aboutCity:
        "Acting driver for Sabarimala is a chauffeur in your own car to Pamba or Nilakkal. The last stretch to Sannidhanam is on foot. Air arrivals use Cochin (COK) or Madurai (IXM). Local 3-hour minimum. Cabzii assigns a driver after you confirm.",
      faqs: [
        {
          question: "Is acting driver in Sabarimala an airport taxi?",
          answer:
            "No. It is a chauffeur in your own car. Sabarimala has no airport. For a Cabzii vehicle, book this cab hub or a Cochin/Madurai cab."
        },
        {
          question: "How do I book an acting driver for Sabarimala?",
          answer:
            "Open this page, pick a Call Driver package, then continue to Call Driver book. Cabzii assigns a professional after you confirm."
        }
      ],
      touristPlaces: [
        { title: "Pamba", body: "Usual vehicle limit. Share the parking stand as pickup for the return." },
        { title: "Nilakkal", body: "Base parking chauffeur in your car." },
        { title: "Outstation from Tamil Nadu", body: "Outstation Call Driver for the pilgrimage highway day." }
      ],
      popularLocations: ["Pamba", "Nilakkal", "Erumeli"]
    },
    services: {
      "/services/outstation-cab/sabarimala": {
        h1: "Outstation Cab to Sabarimala",
        productName: "Outstation Cab to Sabarimala",
        seoTitle: "Outstation Cab Sabarimala | Pamba Taxi | Cabzii",
        seoDescription:
          "Book outstation cabs to Sabarimala — Pamba and Nilakkal from Tamil Nadu and Kochi. Pay 50% to confirm. Tolls extra.",
        seoKeywords: "outstation cab sabarimala, sabarimalai taxi, pamba outstation cab, cabzii",
        intro: "Outstation to Sabarimala uses the live booking engine. Vehicles stop at Pamba or Nilakkal."
      },
      "/services/one-way-cab/sabarimala": {
        h1: "One-Way Cab to Sabarimala",
        productName: "One-Way Cab to Sabarimala",
        seoTitle: "One-Way Cab Sabarimala | Book Online | Cabzii",
        seoDescription:
          "Book one-way cabs to Sabarimala. Pamba or Nilakkal drop without a return mix-up. Pay 50% to confirm. Tolls extra.",
        seoKeywords: "one way cab sabarimala, pamba drop taxi, cabzii",
        intro: "One-way drops to Pamba or Nilakkal. Return is a separate booking if you need it."
      },
      "/services/tempo-traveller/sabarimala": {
        h1: "Tempo Traveller to Sabarimala",
        productName: "Tempo Traveller to Sabarimala",
        seoTitle: "Tempo Traveller Sabarimala | Group Cab | Cabzii",
        seoDescription:
          "Book a tempo traveller to Sabarimala for group pilgrimages. Pamba or Nilakkal drop. Pay 50% to confirm. Tolls extra.",
        seoKeywords: "tempo traveller sabarimala, group cab sabarimalai, 12 seater pamba, cabzii",
        intro: "Group Mandala–Makaravilakku trips. Vehicles stop at Pamba or Nilakkal."
      }
    }
  },
  {
    slug: "ayyappankovil",
    name: "Ayyappan Kovil",
    state: "Kerala",
    sortOrder: 21,
    airportTaxi: false,
    airportDetails:
      "No commercial passenger airport. Usual air gateways are Cochin (COK) and Madurai (IXM). This is not Sabarimala Sannidhanam.",
    cab: {
      seoTitle: "Cab Booking Ayyappan Kovil | Idukki Taxi | Cabzii",
      seoDescription:
        "Book Ayyappan Kovil cabs on Cabzii — Idukki Ayyappa temple, not Sabarimala Sannidhanam. No local airport. Pay 50% to confirm. Tolls extra.",
      seo: "ayyappan kovil taxi, ayyappankovil cab, idukki ayyappa temple cab, ayyappan koil taxi, cabzii",
      h1: "Cab Booking in Ayyappan Kovil — Idukki",
      lead: "Book a Cabzii cab in Ayyappan Kovil (Idukki) for the Ayyappa temple town. This is not the Sabarimala Sannidhanam trek. There is no local airport — air arrivals use Cochin (COK) or Madurai (IXM).",
      aboutCity:
        "Ayyappan Kovil is an Idukki Ayyappa temple town, separate from Sabarimala. Vehicles can reach the temple approach on ghat roads. For Sabarimala Pamba/Nilakkal drops use the Sabarimala hub. No commercial airport here — COK and IXM are the usual air gateways.",
      faqs: [
        {
          question: "Is Ayyappan Kovil the same as Sabarimala?",
          answer:
            "No. Ayyappan Kovil is an Idukki temple town. For Pamba or Nilakkal, book the Sabarimala cab page."
        },
        {
          question: "Is there an airport taxi in Ayyappan Kovil?",
          answer:
            "No. Fly into Cochin (COK) or Madurai (IXM), then book an outstation cab to Ayyappan Kovil."
        },
        {
          question: "How do I book a cab in Ayyappan Kovil?",
          answer:
            "Use the form on this page. Enter pickup and drop, compare vehicles, then pay 50% to confirm. Tolls extra unless listed."
        }
      ],
      touristPlaces: [
        { title: "Ayyappan Kovil temple", body: "Temple-town pickup. Share the shrine or lodge landmark." },
        { title: "Idukki / Kumily road", body: "Ghat approach. SUV is the usual ask with luggage." },
        { title: "Thekkady approach", body: "Short onward. Treat as outstation or hourly." },
        { title: "Sabarimala connection", body: "For Pamba or Nilakkal, book the Sabarimala cab page." }
      ],
      popularLocations: ["Ayyappan Kovil temple", "Idukki", "Kumily road"]
    },
    acting: {
      seoTitle: "Acting Driver Ayyappan Kovil | Call Driver | Cabzii",
      seoDescription:
        "Hire an acting driver in Ayyappan Kovil (Idukki) for your own car — temple town ghat, not Sabarimala Sannidhanam. No local airport taxi.",
      seo: "acting driver ayyappan kovil, call driver ayyappankovil, idukki chauffeur, ayyappa temple driver",
      h1: "Acting Driver in Ayyappan Kovil | Cabzii Call Driver",
      lead: "Book a professional to drive your car in Ayyappan Kovil. Same Call Driver packages. There is no local airport taxi.",
      aboutCity:
        "Acting driver in Ayyappan Kovil is a chauffeur for your own car in the Idukki temple town. This is not the Sabarimala trek. Air arrivals use Cochin (COK) or Madurai (IXM). Local 3-hour minimum. Cabzii assigns a driver after you confirm.",
      faqs: [
        {
          question: "Is acting driver in Ayyappan Kovil an airport taxi?",
          answer:
            "No. It is a chauffeur in your own car. For a Cabzii vehicle, book cab booking Ayyappan Kovil."
        },
        {
          question: "How do I book an acting driver in Ayyappan Kovil?",
          answer:
            "Open this page, pick a Call Driver package, then continue to Call Driver book. Cabzii assigns a professional after you confirm."
        }
      ],
      touristPlaces: [
        { title: "Ayyappan Kovil temple", body: "Temple-town local hours in your car." },
        { title: "Idukki ghat", body: "Hill-road chauffeur. SUV is the usual ask." },
        { title: "Sabarimala run", body: "For Pamba or Nilakkal, use the Sabarimala acting-driver page." }
      ],
      popularLocations: ["Ayyappan Kovil temple", "Idukki"]
    },
    services: {
      "/services/outstation-cab/ayyappankovil": {
        h1: "Outstation Cab to Ayyappan Kovil",
        productName: "Outstation Cab to Ayyappan Kovil",
        seoTitle: "Outstation Cab Ayyappan Kovil | Idukki | Cabzii",
        seoDescription:
          "Book outstation cabs to Ayyappan Kovil (Idukki). Ghat-ready cars. Not a Sabarimala Sannidhanam drop. Pay 50% to confirm. Tolls extra.",
        seoKeywords: "outstation cab ayyappan kovil, idukki ayyappa taxi, cabzii",
        intro: "Outstation to the Idukki temple town. For Pamba/Nilakkal use the Sabarimala hub."
      },
      "/services/one-way-cab/ayyappankovil": {
        h1: "One-Way Cab to Ayyappan Kovil",
        productName: "One-Way Cab to Ayyappan Kovil",
        seoTitle: "One-Way Cab Ayyappan Kovil | Book Online | Cabzii",
        seoDescription:
          "Book one-way cabs to Ayyappan Kovil. Inter-city drops without a return mix-up. Pay 50% to confirm. Tolls extra.",
        seoKeywords: "one way cab ayyappan kovil, ayyappankovil one way taxi, cabzii",
        intro: "One-way drops to Ayyappan Kovil from Tamil Nadu or Kochi."
      },
      "/services/tempo-traveller/ayyappankovil": {
        h1: "Tempo Traveller to Ayyappan Kovil",
        productName: "Tempo Traveller to Ayyappan Kovil",
        seoTitle: "Tempo Traveller Ayyappan Kovil | Group | Cabzii",
        seoDescription:
          "Book a tempo traveller to Ayyappan Kovil for family temple groups. Pay 50% to confirm. Tolls extra.",
        seoKeywords: "tempo traveller ayyappan kovil, group cab idukki, cabzii",
        intro: "Group temple-town trips in Idukki. Not a Sabarimala Sannidhanam drop."
      }
    }
  }
];

function cabPage(city) {
  return {
    pageType: "cab-booking",
    citySlug: city.slug,
    seoTitle: city.cab.seoTitle,
    seoDescription: city.cab.seoDescription,
    seo: city.cab.seo,
    h1: city.cab.h1,
    lead: city.cab.lead,
    aboutCity: city.cab.aboutCity,
    body: "",
    faqs: city.cab.faqs,
    touristPlaces: city.cab.touristPlaces,
    popularLocations: city.cab.popularLocations,
    airportDetails: city.airportDetails,
    published: true
  };
}

function actingPage(city) {
  return {
    pageType: "acting-driver",
    citySlug: city.slug,
    seoTitle: city.acting.seoTitle,
    seoDescription: city.acting.seoDescription,
    seo: city.acting.seo,
    h1: city.acting.h1,
    lead: city.acting.lead,
    aboutCity: city.acting.aboutCity,
    faqs: city.acting.faqs,
    touristPlaces: city.acting.touristPlaces,
    popularLocations: city.acting.popularLocations,
    published: true
  };
}

function pageSeoOverlays(city) {
  const cab = cabPage(city);
  const acting = actingPage(city);
  return {
    ...city.services,
    [`/cab-booking/${city.slug}`]: {
      h1: cab.h1,
      productName: cab.h1,
      seoTitle: cab.seoTitle,
      seoDescription: cab.seoDescription,
      seoKeywords: cab.seo,
      intro: cab.lead
    },
    [`/acting-driver/${city.slug}`]: {
      h1: acting.h1,
      productName: acting.h1,
      seoTitle: acting.seoTitle,
      seoDescription: acting.seoDescription,
      seoKeywords: acting.seo,
      intro: acting.lead
    }
  };
}

async function upsertCity(city) {
  const payload = {
    name: city.name,
    slug: city.slug,
    cityId: city.slug,
    state: city.state,
    country: "India",
    isActive: true,
    sortOrder: city.sortOrder,
    description: city.cab.aboutCity,
    content: city.cab.aboutCity,
    airportDetails: city.airportDetails,
    popularLocations: city.cab.popularLocations,
    services: {
      cabBooking: true,
      airportTaxi: city.airportTaxi,
      actingDriver: true,
      holidayTrips: true
    }
  };
  const existing =
    (await City.findOne({ slug: city.slug })) ||
    (await City.findOne({ cityId: city.slug })) ||
    (await City.findOne({ name: new RegExp(`^${city.name}$`, "i") }));
  if (existing) {
    await City.updateOne({ _id: existing._id }, { $set: payload });
    console.log("City updated:", city.slug);
    return;
  }
  await City.collection.insertOne({ ...payload, createdAt: new Date(), updatedAt: new Date() });
  console.log("City created:", city.slug);
}

async function upsertCityPage(page) {
  await SeoCityPage.findOneAndUpdate(
    { pageType: page.pageType, citySlug: page.citySlug },
    { $set: page },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log("SeoCityPage:", page.pageType, page.citySlug);
}

async function mergePageSeo(overlays) {
  const settings = await SiteSettings.findOne({ key: "main" });
  if (!settings) {
    console.log("No site settings document — skipped pageSeo overlays.");
    return;
  }
  const pageSeo = { ...(settings.pageSeo || {}), ...overlays };
  settings.pageSeo = pageSeo;
  settings.markModified("pageSeo");
  await settings.save();
  console.log("pageSeo overlays:", Object.keys(overlays).join(", "));
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Missing MONGODB_URI");
    process.exit(1);
  }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000 });
  let overlays = {};
  for (const city of CITIES) {
    await upsertCity(city);
    await upsertCityPage(cabPage(city));
    await upsertCityPage(actingPage(city));
    overlays = { ...overlays, ...pageSeoOverlays(city) };
  }
  await mergePageSeo(overlays);
  await mongoose.disconnect();
  console.log("Published Sabarimala and Ayyappan Kovil (no airport).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
