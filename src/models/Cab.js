const mongoose = require("mongoose");
const {
  packageFareSchema,
  farePackageLabelsSchema,
  cabFarePackagesSchema
} = require("./fareSchemas");
const { mongooseFields: catalogProductFields } = require("../utils/catalogProductFields");

const cabSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    vendor: { type: String, required: true, trim: true },
    vendorAdminPhone: { type: String, default: "" },
    type: { type: String, required: true, trim: true },
    seats: { type: Number, default: 4, min: 1, max: 80 },
    bags: { type: Number, default: 2, min: 0, max: 10 },
    examples: { type: String, default: "" },
    /** Base vehicle model — e.g. Maruti Dzire (MrMed "Salt" equivalent) */
    vehicleModel: { type: String, trim: true, default: "" },
    /** Primary service form — One Way, Round Trip, Hourly, Local Package */
    serviceForm: { type: String, trim: true, default: "One Way" },
    ac: { type: Boolean, default: true },
    fuelIncluded: { type: Boolean, default: true },
    price: { type: Number, required: true, min: 0 },
    hourlyRate: { type: Number, default: 0, min: 0 },
    dayRate: { type: Number, default: 0, min: 0 },
    extraHourRate: { type: Number, default: 0, min: 0 },
    originalPrice: { type: Number, default: 0, min: 0 },
    discountPercentage: { type: Number, default: 0, min: 0, max: 99 },
    rating: { type: Number, min: 0, max: 5 },
    /** Count of admin-approved verified reviews — ratings are hidden in UI when 0. */
    reviewCount: { type: Number, default: 0, min: 0 },
    image: { type: String, default: "" },
    gallery: { type: [String], default: [] },
    city: { type: String, default: "", trim: true, index: true },
    location: { type: String, default: "", trim: true },
    features: { type: [String], default: [] },
    farePackages: { type: cabFarePackagesSchema, default: () => ({}) },
    farePackageLabels: { type: farePackageLabelsSchema, default: () => ({}) },
    seo: { type: String, default: "" },
    seoTitle: { type: String, default: "" },
    seoDescription: { type: String, default: "" },
    ...catalogProductFields,
    status: { type: String, enum: ["active", "inactive"], default: "active", index: true },
    isDeleted: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

const Cab = mongoose.model("Cab", cabSchema);

module.exports = { Cab, packageFareSchema, cabFarePackagesSchema };
