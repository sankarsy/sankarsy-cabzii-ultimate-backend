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
    amenities: { type: [String], default: [] },
    rating: { type: Number, default: 4.2 },
    reviewCount: { type: Number, default: 100 },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    seoTitle: { type: String, trim: true, default: "" },
    seoDescription: { type: String, trim: true, default: "" },
    seo: { type: String, trim: true, default: "" }
  },
  { timestamps: true }
);

const BusTrip = mongoose.model("BusTrip", busTripSchema);

module.exports = { BusTrip };
