const mongoose = require("mongoose");

const stopSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: "" },
    time: { type: String, trim: true, default: "" },
    landmark: { type: String, trim: true, default: "" }
  },
  { _id: false }
);

const busTripSchema = new mongoose.Schema(
  {
    operator: { type: String, required: true, trim: true },
    operatorCode: { type: String, trim: true, default: "" },
    operatorLogo: { type: String, trim: true, default: "" },
    vendor: { type: String, trim: true, default: "Cabzii Partner" },
    vendorAdminPhone: { type: String, trim: true, default: "" },
    fromCity: { type: String, required: true, trim: true, index: true },
    toCity: { type: String, required: true, trim: true, index: true },
    departureTime: { type: String, trim: true, default: "06:00" },
    arrivalTime: { type: String, trim: true, default: "14:00" },
    duration: { type: String, trim: true, default: "8h" },
    durationMin: { type: Number, default: 480 },
    busType: { type: String, trim: true, default: "AC Seater" },
    seaterPrice: { type: Number, default: 599 },
    sleeperPrice: { type: Number, default: 899 },
    lowerBerthPrice: { type: Number, default: 999 },
    upperBerthPrice: { type: Number, default: 799 },
    boardingPoints: { type: [stopSchema], default: [] },
    droppingPoints: { type: [stopSchema], default: [] },
    bookedSeats: { type: [String], default: [] },
    bookedSeatGenders: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    amenities: { type: [String], default: [] },
    rating: { type: Number, default: 4.2 },
    reviewCount: { type: Number, default: 100 },
    exclusiveDiscount: { type: Number, default: 100 },
    tripGuaranteePrice: { type: Number, default: 24 },
    distanceKm: { type: Number, default: 0 },
    onTimePercent: { type: Number, default: 86 },
    onTimeTrips: { type: Number, default: 957 },
    onTimeTotal: { type: Number, default: 1113 },
    layoutPreset: { type: String, trim: true, default: "" },
    cancellationPolicy: {
      type: [
        {
          hoursBefore: { type: Number, default: 0 },
          refundPercent: { type: Number, default: 0 }
        }
      ],
      default: []
    },
    restStops: {
      type: [
        {
          name: { type: String, trim: true, default: "" },
          time: { type: String, trim: true, default: "" },
          durationMin: { type: Number, default: 15 },
          features: { type: [String], default: [] }
        }
      ],
      default: []
    },
    routeStops: { type: [String], default: [] },
    policies: {
      luggage: { type: String, trim: true, default: "" },
      pets: { type: String, trim: true, default: "" },
      liquor: { type: String, trim: true, default: "" },
      pickupTime: { type: String, trim: true, default: "" }
    },
    liveTracking: {
      enabled: { type: Boolean, default: true },
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      updatedAt: { type: Date, default: null },
      status: { type: String, trim: true, default: "on_time" }
    },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    slug: { type: String, trim: true, default: "" },
    enterpriseSeo: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    seoTitle: { type: String, trim: true, default: "" },
    seoDescription: { type: String, trim: true, default: "" },
    seo: { type: String, trim: true, default: "" }
  },
  { timestamps: true }
);

const BusTrip = mongoose.model("BusTrip", busTripSchema);

module.exports = { BusTrip };
