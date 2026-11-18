"use strict";

/**
 * Publish Kodaikanal, Ooty (no airport) and Pondicherry (PNY airport).
 * Usage: node scripts/publishTouristCities.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const { City } = require("../src/models/City");
const { SeoCityPage } = require("../src/models/SeoCityPage");
const { SiteSettings } = require("../src/models/SiteSettings");

const CITIES = [
  {
    slug: "kodaikanal",
    name: "Kodaikanal",
    state: "Tamil Nadu",
    sortOrder: 17,
    airportTaxi: false,
    airportDetails: "No commercial passenger airport. Nearest air gateway is Madurai Airport (IXM).",
    cab: {
      seoTitle: "Cab Booking in Kodaikanal | Hill Taxi | Cabzii",
      seoDescription:
        "Book Kodaikanal cabs on Cabzii — lake, Coaker’s Walk and ghat transfers from Madurai. No local airport. Tolls extra.",
      seo: "cab booking kodaikanal, kodaikanal taxi, kodai cab, madurai to kodaikanal cab, hill station taxi kodaikanal",
      h1: "Cab Booking in Kodaikanal — Lake and Ghat Taxi",
      lead: "Book a Cabzii cab in Kodaikanal for lake loops, viewpoints and the Madurai ghat. Local hourly packages and outstation fares show before you pay. There is no Kodaikanal airport taxi — air arrivals use Madurai (IXM).",
      aboutCity:
        "Kodaikanal is a ghat-road hill station with no commercial airport. Guests usually fly into Madurai (IXM) or arrive at Kodai Road station, then take a Cabzii cab up the hairpins. SUV or Innova is the usual ask with luggage. Lake Road, Coaker’s Walk and hotel loops fit a local hourly package.",
      faqs: [
        {
          question: "Is there an airport taxi in Kodaikanal?",
          answer:
            "No. Kodaikanal has no commercial passenger airport. Fly into Madurai (IXM), then book a Madurai airport taxi or a Madurai–Kodaikanal outstation cab."
        },
        {
          question: "How do I book a cab in Kodaikanal?",
          answer:
            "Use the form on this page. Enter pickup and drop, choose local or outstation, compare vehicles, then confirm. Tolls extra unless listed."
        },
        {
          question: "Which car is better for the ghat?",
          answer: "SUV or Innova is the usual ask with luggage on hairpin sections. Sedans work for light bags on a dry-day town loop."
        }
      ],
      touristPlaces: [
        { title: "Kodai Lake / Lake Road", body: "Hotel and promenade pickup. Share the property name as pickup." },
        { title: "Coaker’s Walk", body: "Viewpoint drop. Book waiting only if you want the cab to stay." },
        { title: "Kodai Road station", body: "Rail approach below the hill. Treat as an outstation transfer." },
        { title: "Madurai airport transfer", body: "No local airport. Book IXM pickup or drop as outstation from this hub." }
      ],
      popularLocations: ["Lake Road", "Coaker's Walk", "Seven Roads", "Anna Salai", "Kodai Road"]
    },
    acting: {
      seoTitle: "Acting Driver in Kodaikanal | Call Driver | Cabzii",
      seoDescription:
        "Hire an acting driver in Kodaikanal for your own car — lake loops and Madurai ghat days. Same Call Driver packages. No local airport taxi.",
      seo: "acting driver kodaikanal, call driver kodaikanal, driver on hire kodai, ghat chauffeur kodaikanal",
      h1: "Acting Driver in Kodaikanal | Cabzii Call Driver",
      lead: "Book a professional to drive your car in Kodaikanal. Same Call Driver packages — local, outstation, monthly quote, corporate and valet. There is no Kodaikanal airport taxi.",
      aboutCity:
        "Acting driver in Kodaikanal is a chauffeur for your own car on Lake Road, Coaker’s Walk and the ghat towards Madurai or Kodai Road. Air arrivals use Madurai (IXM). Local 3-hour minimum. Cabzii assigns a driver after you confirm.",
      faqs: [
        {
          question: "Is acting driver in Kodaikanal an airport taxi?",
          answer:
            "No. It is a chauffeur in your own car. Kodaikanal has no commercial airport. For a Cabzii vehicle, book cab booking Kodaikanal or a Madurai cab from IXM."
        },
        {
          question: "How do I book an acting driver in Kodaikanal?",
          answer:
            "Open this page, pick a Call Driver package, then continue to Call Driver book. Cabzii assigns a professional after you confirm."
        }
      ],
      touristPlaces: [
        { title: "Lake Road hotels", body: "Hill-town local hours in your car. Share the property gate as pickup." },
        { title: "Coaker’s Walk", body: "Viewpoint loops with waiting on a local Call Driver day." },
        { title: "Outstation to Madurai", body: "Outstation Call Driver in your car for the ghat day." }
      ],
      popularLocations: ["Lake Road", "Coaker's Walk", "Seven Roads"]
    },
    services: {
      "/services/outstation-cab/kodaikanal": {
        h1: "Outstation Cab in Kodaikanal",
        productName: "Outstation Cab in Kodaikanal",
        seoTitle: "Outstation Cab Kodaikanal | Book Online | Cabzii",
        seoDescription:
          "Book outstation cabs from Kodaikanal to Madurai, Palani and Tamil Nadu towns. Ghat-ready cars. Tolls extra.",
        seoKeywords: "outstation cab kodaikanal, kodaikanal to madurai cab, kodai outstation taxi, cabzii",
        intro: "Outstation from Kodaikanal uses the live booking engine — not a local airport page."
      },
      "/services/one-way-cab/kodaikanal": {
        h1: "One-Way Cab in Kodaikanal",
        productName: "One-Way Cab in Kodaikanal",
        seoTitle: "One-Way Cab Kodaikanal | Book Online | Cabzii",
        seoDescription:
          "Book one-way cabs from Kodaikanal. Inter-city drops without a return charge mix-up. Tolls extra.",
        seoKeywords: "one way cab kodaikanal, kodaikanal one way taxi, cabzii",
        intro: "One-way drops from Kodaikanal to Madurai, Kodai Road and nearby towns."
      },
      "/services/tempo-traveller/kodaikanal": {
        h1: "Tempo Traveller in Kodaikanal",
        productName: "Tempo Traveller in Kodaikanal",
        seoTitle: "Tempo Traveller Kodaikanal | Book Online | Cabzii",
        seoDescription:
          "Book a tempo traveller in Kodaikanal for family hill groups. Tolls extra.",
        seoKeywords: "tempo traveller kodaikanal, 12 seater kodaikanal, group cab kodai, cabzii",
        intro: "Group hill days and family ghat trips from Kodaikanal."
      }
    }
  },
  {
    slug: "ooty",
    name: "Ooty",
    state: "Tamil Nadu",
    sortOrder: 18,
    airportTaxi: false,
    airportDetails: "No commercial passenger airport. Nearest air gateway is Coimbatore International Airport (CJB).",
    cab: {
      seoTitle: "Cab Booking in Ooty | Hill Station Taxi | Cabzii",
      seoDescription:
        "Book Ooty cabs on Cabzii — Charing Cross, Botanical Garden, Coonoor and CJB ghat transfers. No local airport. Tolls extra.",
      seo: "cab booking ooty, ooty taxi, udhagamandalam cab, coimbatore to ooty cab, hill station taxi ooty",
      h1: "Cab Booking in Ooty — Town and Ghat Taxi",
      lead: "Book a Cabzii cab in Ooty for town loops, Coonoor and the Coimbatore ghat. Local hourly packages and outstation fares show before you pay. There is no Ooty airport taxi — air arrivals use Coimbatore (CJB).",
      aboutCity:
        "Ooty (Udhagamandalam) traffic is town loops plus the ghat from Mettupalayam and Coimbatore (CJB). There is no commercial airport here. Book earlier on summer weekends. Tempo travellers suit family groups; sedans are tight with hill luggage.",
      faqs: [
        {
          question: "Is there an airport taxi in Ooty?",
          answer:
            "No. Ooty has no commercial passenger airport. Fly into Coimbatore (CJB), then book a Coimbatore airport taxi or a Coimbatore–Ooty outstation cab."
        },
        {
          question: "How do I book a cab in Ooty?",
          answer:
            "Use the form on this page. Enter pickup and drop, choose local or outstation, compare vehicles, then confirm. Tolls extra unless listed."
        },
        {
          question: "Is Coonoor a separate cab product?",
          answer: "No. Coonoor is a short hill hop from this Ooty hub — local or a short outstation, not a second SEO page."
        }
      ],
      touristPlaces: [
        { title: "Charing Cross", body: "Town-centre pickup. Enter the hotel or junction landmark." },
        { title: "Botanical Garden", body: "Garden and nearby hotel drops. Confirm waiting if you want the cab to stay." },
        { title: "Coonoor", body: "Short hill hop. Treat as local or a short outstation." },
        { title: "Coimbatore airport transfer", body: "No local airport. Book CJB pickup or drop as outstation from this hub." }
      ],
      popularLocations: ["Charing Cross", "Botanical Garden", "Commercial Road", "Coonoor", "Lovedale"]
    },
    acting: {
      seoTitle: "Acting Driver in Ooty | Call Driver | Cabzii",
      seoDescription:
        "Hire an acting driver in Ooty for your own car — town loops, Coonoor and CJB ghat days. Same Call Driver packages. No local airport taxi.",
      seo: "acting driver ooty, call driver ooty, driver on hire udhagamandalam, coonoor chauffeur",
      h1: "Acting Driver in Ooty | Cabzii Call Driver",
      lead: "Book a professional to drive your car in Ooty. Same Call Driver packages — local, outstation, monthly quote, corporate and valet. There is no Ooty airport taxi.",
      aboutCity:
        "Acting driver in Ooty is a chauffeur for your own car around Charing Cross, Botanical Garden hotels and Coonoor. Air arrivals use Coimbatore (CJB). Local 3-hour minimum. Cabzii assigns a driver after you confirm.",
      faqs: [
        {
          question: "Is acting driver in Ooty an airport taxi?",
          answer:
            "No. It is a chauffeur in your own car. Ooty has no commercial airport. For a Cabzii vehicle, book cab booking Ooty or a Coimbatore cab from CJB."
        },
        {
          question: "How do I book an acting driver in Ooty?",
          answer:
            "Open this page, pick a Call Driver package, then continue to Call Driver book. Cabzii assigns a professional after you confirm."
        }
      ],
      touristPlaces: [
        { title: "Charing Cross", body: "Town-centre local hours in your car. Enter the hotel landmark." },
        { title: "Botanical Garden hotels", body: "Garden-side pickup for viewpoint loops." },
        { title: "Outstation to Coimbatore", body: "Outstation Call Driver in your car for the CJB ghat day." }
      ],
      popularLocations: ["Charing Cross", "Botanical Garden", "Coonoor"]
    },
    services: {
      "/services/outstation-cab/ooty": {
        h1: "Outstation Cab in Ooty",
        productName: "Outstation Cab in Ooty",
        seoTitle: "Outstation Cab Ooty | Book Online | Cabzii",
        seoDescription:
          "Book outstation cabs from Ooty to Coimbatore, Mysore and Chennai. Ghat-ready cars. Tolls extra.",
        seoKeywords: "outstation cab ooty, ooty to coimbatore cab, udhagamandalam outstation taxi, cabzii",
        intro: "Outstation from Ooty uses the live booking engine — not a local airport page."
      },
      "/services/one-way-cab/ooty": {
        h1: "One-Way Cab in Ooty",
        productName: "One-Way Cab in Ooty",
        seoTitle: "One-Way Cab Ooty | Book Online | Cabzii",
        seoDescription:
          "Book one-way cabs from Ooty. Inter-city drops without a return charge mix-up. Tolls extra.",
        seoKeywords: "one way cab ooty, ooty one way taxi, cabzii",
        intro: "One-way drops from Ooty to Coimbatore, Mettupalayam and Mysore."
      },
      "/services/tempo-traveller/ooty": {
        h1: "Tempo Traveller in Ooty",
        productName: "Tempo Traveller in Ooty",
        seoTitle: "Tempo Traveller Ooty | Book Online | Cabzii",
        seoDescription:
          "Book a tempo traveller in Ooty for family and school hill groups. Tolls extra.",
        seoKeywords: "tempo traveller ooty, 12 seater ooty, group cab ooty, cabzii",
        intro: "Group hill days and family ghat trips from Ooty."
      }
    }
  },
  {
    slug: "pondicherry",
    name: "Pondicherry",
    state: "Puducherry",
    sortOrder: 19,
    airportTaxi: true,
    airportDetails: "Pondicherry Airport (PNY). Small commercial field — many visitors still arrive via Chennai (MAA) and ECR.",
    cab: {
      seoTitle: "Cab Booking in Pondicherry | White Town | Cabzii",
      seoDescription:
        "Book Pondicherry cabs on Cabzii — White Town, Promenade, Auroville and ECR from Chennai. Tolls extra.",
      seo: "cab booking pondicherry, taxi puducherry, white town cab, auroville taxi, chennai to pondicherry cab",
      h1: "Cab Booking in Pondicherry — White Town and ECR",
      lead: "Book a Cabzii cab in Pondicherry for White Town, Auroville and the Chennai ECR. Local hourly packages, outstation and PNY airport fares show before you pay.",
      aboutCity:
        "Puducherry (Pondicherry) trips cover White Town, the Promenade, bus stand and Auroville. The usual highway from Chennai is ECR/NH32. Pondicherry Airport (PNY) is a small commercial field — most visitors still arrive by road from Chennai. Tolls on the corridor are extra unless listed.",
      faqs: [
        {
          question: "Is there an airport taxi in Pondicherry?",
          answer:
            "Yes. Book Pondicherry Airport (PNY) pickup and drop. Many visitors still fly into Chennai (MAA) and take an ECR cab instead."
        },
        {
          question: "How do I book a cab in Pondicherry?",
          answer:
            "Use the form on this page. Enter pickup and drop, choose local, outstation or airport, compare vehicles, then confirm. Tolls extra unless listed."
        },
        {
          question: "Is Auroville a city hop?",
          answer: "Treat Auroville as a short outstation or hourly hire, not a White Town street fare."
        }
      ],
      touristPlaces: [
        { title: "White Town / Promenade", body: "Heritage streets and seafront. Enter the hotel or cafe landmark as pickup." },
        { title: "Auroville", body: "Township north of the city. Short outstation or hourly hire." },
        { title: "Pondicherry bus stand", body: "City interchange after a bus arrival." },
        { title: "Pondicherry Airport (PNY)", body: "Small commercial field. Book the airport-taxi page for terminal pickup." }
      ],
      popularLocations: ["White Town", "Auroville", "Lawspet", "Villianur", "Promenade", "ECR"]
    },
    acting: {
      seoTitle: "Acting Driver in Pondicherry | Call Driver | Cabzii",
      seoDescription:
        "Hire an acting driver in Pondicherry for your own car — White Town, Auroville and ECR days from Chennai. Same Call Driver packages.",
      seo: "acting driver pondicherry, call driver puducherry, driver on hire pondicherry, white town chauffeur",
      h1: "Acting Driver in Pondicherry | Cabzii Call Driver",
      lead: "Book a professional to drive your car in Pondicherry. Same Call Driver packages — local, outstation, airport, monthly quote, corporate and valet.",
      aboutCity:
        "Acting driver in Pondicherry is Cabzii Call Driver for your own car in White Town, along the Promenade and out to Auroville. PNY chauffeur is driver-only in your vehicle, not a Pondicherry airport taxi. Local 3-hour minimum. Cabzii assigns a driver after you confirm.",
      faqs: [
        {
          question: "Is acting driver in Pondicherry an airport taxi?",
          answer:
            "No. Airport Call Driver is a chauffeur in your own car. For a Cabzii vehicle to PNY, book Pondicherry airport taxi."
        },
        {
          question: "How do I book an acting driver in Pondicherry?",
          answer:
            "Open this page, pick a Call Driver package, then continue to Call Driver book. Cabzii assigns a professional after you confirm."
        }
      ],
      touristPlaces: [
        { title: "White Town / Promenade", body: "Heritage-street local hours in your car. Enter the hotel landmark." },
        { title: "Auroville", body: "Township run as local or short outstation in your car." },
        { title: "ECR towards Chennai", body: "Outstation Call Driver for the coastal highway day." }
      ],
      popularLocations: ["White Town", "Promenade", "Auroville", "ECR"]
    },
    services: {
      "/services/outstation-cab/pondicherry": {
        h1: "Outstation Cab in Pondicherry",
        productName: "Outstation Cab in Pondicherry",
        seoTitle: "Outstation Cab Pondicherry | Book Online | Cabzii",
        seoDescription:
          "Book outstation cabs from Pondicherry to Chennai ECR, Tirupati and Tamil Nadu towns. Tolls extra.",
        seoKeywords: "outstation cab pondicherry, pondicherry to chennai cab, ecr cab pondicherry, cabzii",
        intro: "Outstation from Pondicherry uses the live booking engine, including ECR returns to Chennai."
      },
      "/services/one-way-cab/pondicherry": {
        h1: "One-Way Cab in Pondicherry",
        productName: "One-Way Cab in Pondicherry",
        seoTitle: "One-Way Cab Pondicherry | Book Online | Cabzii",
        seoDescription:
          "Book one-way cabs from Pondicherry. Inter-city drops without a return charge mix-up. Tolls extra.",
        seoKeywords: "one way cab pondicherry, pondicherry one way taxi, cabzii",
        intro: "One-way drops from Pondicherry to Chennai and along ECR."
      },
      "/services/tempo-traveller/pondicherry": {
        h1: "Tempo Traveller in Pondicherry",
        productName: "Tempo Traveller in Pondicherry",
        seoTitle: "Tempo Traveller Pondicherry | Book Online | Cabzii",
        seoDescription:
          "Book a tempo traveller in Pondicherry for family ECR and Auroville days. Tolls extra.",
        seoKeywords: "tempo traveller pondicherry, 12 seater pondicherry, group cab puducherry, cabzii",
        intro: "Group White Town and Auroville days from Pondicherry."
      },
      "/services/airport-taxi/pondicherry": {
        h1: "Pondicherry Airport Taxi — PNY Pickup and Drop",
        productName: "Pondicherry Airport Taxi",
        seoTitle: "Pondicherry Airport Taxi | PNY Pickup | Cabzii",
        seoDescription:
          "Book Pondicherry Airport (PNY) pickup and drop on Cabzii. White Town drops. Many visitors still arrive via Chennai (MAA).",
        seoKeywords: "pondicherry airport taxi, pny airport cab, puducherry airport pickup, cabzii airport",
        intro: "PNY is a small commercial field. Enter PNY as From for arrivals. Many travellers still use MAA plus ECR."
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
  console.log("Published Kodaikanal, Ooty (no airport) and Pondicherry (PNY).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
