const mongoose = require("mongoose");

const packageFareSchema = new mongoose.Schema(
  {
    originalPrice: { type: Number, default: 0 },
    price: { type: Number, default: 0 },
    discountPercentage: { type: Number, default: 0 },
    extraKmRate: { type: Number, default: 0 },
    extraHourRate: { type: Number, default: 0 }
  },
  { _id: false }
);

const farePackageLabelsSchema = new mongoose.Schema(
  {
    local4hr: { type: String, default: "Local — 4 Hrs / 40 Km" },
    local8hr: { type: String, default: "Local — 8 Hrs / 80 Km" },
    localDay: { type: String, default: "Local — 8 Hrs / 80 Km" },
    outstation12hr: { type: String, default: "Outstation — Round Trip" },
    outstationOneWay: { type: String, default: "Outstation — One Way" },
    outstationRoundTrip: { type: String, default: "Outstation — Round Trip" }
  },
  { _id: false }
);

const cabFarePackagesSchema = new mongoose.Schema(
  {
    local4hr: { type: packageFareSchema, default: () => ({}) },
    local8hr: { type: packageFareSchema, default: () => ({}) },
    outstationOneWay: { type: packageFareSchema, default: () => ({}) },
    outstationRoundTrip: { type: packageFareSchema, default: () => ({}) }
  },
  { _id: false }
);

const driverFarePackagesSchema = new mongoose.Schema(
  {
    local4hr: { type: packageFareSchema, default: () => ({}) },
    local8hr: { type: packageFareSchema, default: () => ({}) },
    localDay: { type: packageFareSchema, default: () => ({}) },
    outstationOneWay: { type: packageFareSchema, default: () => ({}) },
    outstationRoundTrip: { type: packageFareSchema, default: () => ({}) },
    outstation12hr: { type: packageFareSchema, default: () => ({}) }
  },
  { _id: false }
);

module.exports = {
  packageFareSchema,
  farePackageLabelsSchema,
  cabFarePackagesSchema,
  driverFarePackagesSchema
};
