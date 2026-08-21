const mongoose = require("mongoose");
const { driverFarePackagesSchema, farePackageLabelsSchema } = require("./fareSchemas");
const { mongooseFields: catalogProductFields } = require("../utils/catalogProductFields");
const { vehicleEnterpriseSeoSchema, vehicleFaqSchema } = require("./vehicleSchemas");

const driverSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    /** Driver's own 10-digit mobile. Not the vendor contact number. Empty on historical catalog rows. */
    phone: { type: String, trim: true, default: "" },
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
    serviceAreas: { type: [String], default: [] },
    licenseNumber: { type: String, default: "", trim: true },
    licenseExpiry: { type: String, default: "", trim: true },
    availabilityStatus: {
      type: String,
      enum: ["available", "assigned", "on_trip", "offline", "inactive"],
      default: "available",
      index: true
    },
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
    metaKeywords: { type: String, default: "" },
    canonicalUrl: { type: String, default: "" },
    schemaEnabled: { type: Boolean, default: true },
    faq: { type: [vehicleFaqSchema], default: [] },
    enterpriseSeo: { type: vehicleEnterpriseSeoSchema, default: () => ({}) },
    ...catalogProductFields,
    status: { type: String, enum: ["active", "inactive"], default: "active", index: true },
    isDeleted: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

driverSchema.index(
  { phone: 1 },
  { unique: true, partialFilterExpression: { phone: { $type: "string", $gt: "" } } }
);

const Driver = mongoose.model("Driver", driverSchema);

module.exports = { Driver };
