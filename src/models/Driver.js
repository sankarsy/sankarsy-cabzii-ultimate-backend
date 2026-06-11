const mongoose = require("mongoose");
const { driverFarePackagesSchema, farePackageLabelsSchema } = require("./fareSchemas");
const { mongooseFields: catalogProductFields } = require("../utils/catalogProductFields");

const driverSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    vendor: { type: String, default: "" },
    vendorAdminPhone: { type: String, default: "" },
    type: { type: String, default: "local" },
    experience: { type: String, default: "0 Years" },
    trips: { type: Number, default: 0, min: 0 },
    rating: { type: String, default: "0.0" },
    /** Count of admin-approved verified reviews — ratings are hidden in UI when 0. */
    reviewCount: { type: Number, default: 0, min: 0 },
    image: { type: String, default: "" },
    gallery: { type: [String], default: [] },
    city: { type: String, default: "", trim: true, index: true },
    location: { type: String, default: "", trim: true },
    discountPercentage: { type: Number, default: 0, min: 0, max: 99 },
    languages: { type: [String], default: [] },
    supportedVehicles: { type: [String], default: [] },
    pricing: {
      hourly: { type: Number, default: 0, min: 0 },
      day: { type: Number, default: 0, min: 0 },
      extraHour: { type: Number, default: 0, min: 0 }
    },
    farePackages: { type: driverFarePackagesSchema, default: () => ({}) },
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

const Driver = mongoose.model("Driver", driverSchema);

module.exports = { Driver };
