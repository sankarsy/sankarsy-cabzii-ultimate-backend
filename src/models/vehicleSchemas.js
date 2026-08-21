const mongoose = require("mongoose");

/** Dynamic fare package — replaces fixed farePackages keys */
const vehiclePackageSchema = new mongoose.Schema(
  {
    packageType: {
      type: String,
      trim: true,
      default: "custom",
      enum: [
        "local_4hr",
        "local_5hr",
        "local_8hr",
        "local_10hr",
        "local_15hr",
        "airport_pickup",
        "airport_drop",
        "one_way",
        "round_trip",
        "wedding",
        "corporate",
        "hourly",
        "custom"
      ]
    },
    packageName: { type: String, trim: true, default: "" },
    includedHours: { type: Number, default: 0, min: 0 },
    includedKm: { type: Number, default: 0, min: 0 },
    originalPrice: { type: Number, default: 0, min: 0 },
    price: { type: Number, default: 0, min: 0 },
    discountPercentage: { type: Number, default: 0, min: 0, max: 100 },
    extraKmRate: { type: Number, default: 0, min: 0 },
    extraHourRate: { type: Number, default: 0, min: 0 },
    sortOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true }
  },
  { _id: true }
);

const vehicleImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    type: {
      type: String,
      trim: true,
      default: "gallery",
      enum: ["cover", "gallery", "interior", "dashboard", "boot", "side", "rear", "other"]
    },
    alt: { type: String, default: "", trim: true },
    title: { type: String, default: "", trim: true },
    caption: { type: String, default: "", trim: true },
    sortOrder: { type: Number, default: 0 }
  },
  { _id: true }
);

const vehicleSeoReviewSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: "" },
    rating: { type: Number, min: 1, max: 5, default: 5 },
    review: { type: String, trim: true, default: "" },
    location: { type: String, trim: true, default: "" }
  },
  { _id: false }
);

/** Enterprise vehicle SEO fields (Rank Math / Yoast-style) */
const vehicleEnterpriseSeoSchema = new mongoose.Schema(
  {
    robots: { type: String, trim: true, default: "index,follow" },
    ogTitle: { type: String, trim: true, default: "" },
    ogDescription: { type: String, trim: true, default: "" },
    ogImage: { type: String, trim: true, default: "" },
    twitterTitle: { type: String, trim: true, default: "" },
    twitterDescription: { type: String, trim: true, default: "" },
    twitterImage: { type: String, trim: true, default: "" },
    h1: { type: String, trim: true, default: "" },
    h2: { type: [String], default: [] },
    h3: { type: [String], default: [] },
    shortDescription: { type: String, trim: true, default: "" },
    longSeoContent: { type: String, default: "" },
    highlights: { type: [String], default: [] },
    state: { type: String, trim: true, default: "Tamil Nadu" },
    nearbyLocations: { type: [String], default: [] },
    nearbyAirports: { type: [String], default: [] },
    nearbyStations: { type: [String], default: [] },
    nearbyPlaces: { type: [String], default: [] },
    priceUnit: { type: String, trim: true, default: "Per KM" },
    offerText: { type: String, trim: true, default: "" },
    offerEnds: { type: String, trim: true, default: "" },
    youtubeUrl: { type: String, trim: true, default: "" },
    seoReviews: { type: [vehicleSeoReviewSchema], default: [] },
    relatedVehicles: { type: [String], default: [] },
    relatedCities: { type: [String], default: [] },
    relatedPackages: { type: [String], default: [] },
    relatedBlogs: { type: [String], default: [] },
    relatedServices: { type: [String], default: [] },
    seoScore: { type: Number, default: 0, min: 0, max: 100 }
  },
  { _id: false }
);

const vehicleFaqSchema = new mongoose.Schema(
  {
    question: { type: String, trim: true, default: "" },
    answer: { type: String, trim: true, default: "" }
  },
  { _id: false }
);

const vehicleStatsSchema = new mongoose.Schema(
  {
    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0, min: 0 },
    completedTrips: { type: Number, default: 0, min: 0 },
    totalBookings: { type: Number, default: 0, min: 0 },
    views: { type: Number, default: 0, min: 0 },
    wishlistCount: { type: Number, default: 0, min: 0 },
    lastBooked: { type: Date, default: null }
  },
  { _id: false }
);

module.exports = {
  vehiclePackageSchema,
  vehicleImageSchema,
  vehicleFaqSchema,
  vehicleStatsSchema,
  vehicleSeoReviewSchema,
  vehicleEnterpriseSeoSchema
};
