const mongoose = require("mongoose");
const {
  packageFareSchema,
  farePackageLabelsSchema,
  cabFarePackagesSchema
} = require("./fareSchemas");
const {
  vehiclePackageSchema,
  vehicleImageSchema,
  vehicleFaqSchema,
  vehicleStatsSchema,
  vehicleEnterpriseSeoSchema
} = require("./vehicleSchemas");
const { mongooseFields: catalogProductFields } = require("../utils/catalogProductFields");

const cabSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    vendor: { type: String, required: true, trim: true },
    vendorAdminPhone: { type: String, default: "" },
    type: { type: String, required: true, trim: true },
    category: { type: String, trim: true, default: "", index: true },
    seats: { type: Number, default: 4, min: 1, max: 80 },
    bags: { type: Number, default: 2, min: 0, max: 20 },
    doors: { type: Number, default: 4, min: 2, max: 6 },
    examples: { type: String, default: "" },
    vehicleModel: { type: String, trim: true, default: "" },
    vehicleName: { type: String, trim: true, default: "" },
    brand: { type: String, trim: true, default: "", index: true },
    model: { type: String, trim: true, default: "" },
    variant: { type: String, trim: true, default: "" },
    year: { type: Number, min: 1990, max: 2035 },
    serviceForm: { type: String, trim: true, default: "One Way" },
    pickupLocations: { type: [String], default: [] },
    featured: { type: Boolean, default: false, index: true },
    recommended: { type: Boolean, default: false, index: true },
    bestseller: { type: Boolean, default: false, index: true },
    ac: { type: Boolean, default: true },
    airCondition: { type: Boolean, default: true },
    fuelIncluded: { type: Boolean, default: true },
    fuelType: { type: String, trim: true, default: "Petrol" },
    transmission: { type: String, trim: true, default: "Manual" },
    mileage: { type: String, trim: true, default: "" },
    engine: { type: String, trim: true, default: "" },
    gps: { type: Boolean, default: false },
    fastTag: { type: Boolean, default: false },
    musicSystem: { type: Boolean, default: true },
    charger: { type: Boolean, default: false },
    bottledWater: { type: Boolean, default: false },
    childSeat: { type: Boolean, default: false },
    wheelchairAccessible: { type: Boolean, default: false },
    price: { type: Number, required: true, min: 0 },
    startingPrice: { type: Number, default: 0, min: 0, index: true },
    pricePerKm: { type: Number, default: 0, min: 0 },
    pricePerHour: { type: Number, default: 0, min: 0 },
    currency: { type: String, trim: true, default: "INR" },
    hourlyRate: { type: Number, default: 0, min: 0 },
    dayRate: { type: Number, default: 0, min: 0 },
    extraHourRate: { type: Number, default: 0, min: 0 },
    driverAllowance: { type: Number, default: 0, min: 0 },
    originalPrice: { type: Number, default: 0, min: 0 },
    discountPercentage: { type: Number, default: 0, min: 0, max: 100 },
    rating: { type: Number, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },
    image: { type: String, default: "" },
    gallery: { type: [String], default: [] },
    images: { type: [vehicleImageSchema], default: [] },
    city: { type: String, default: "", trim: true, index: true },
    location: { type: String, default: "", trim: true },
    features: { type: [String], default: [] },
    packages: { type: [vehiclePackageSchema], default: [] },
    farePackages: { type: cabFarePackagesSchema, default: () => ({}) },
    farePackageLabels: { type: farePackageLabelsSchema, default: () => ({}) },
    stats: { type: vehicleStatsSchema, default: () => ({}) },
    metaKeywords: { type: String, default: "" },
    canonicalUrl: { type: String, default: "" },
    schemaEnabled: { type: Boolean, default: true },
    faq: { type: [vehicleFaqSchema], default: [] },
    breadcrumb: { type: String, default: "" },
    seo: { type: String, default: "" },
    seoTitle: { type: String, default: "" },
    seoDescription: { type: String, default: "" },
    enterpriseSeo: { type: vehicleEnterpriseSeoSchema, default: () => ({}) },
    cabId: { type: String, trim: true, default: "" },
    ...catalogProductFields,
    status: { type: String, enum: ["active", "inactive"], default: "active", index: true },
    isDeleted: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

cabSchema.index({ productCode: 1 }, { unique: true, sparse: true });
cabSchema.index({ title: "text", vehicleName: "text", brand: "text", model: "text", city: "text" });

const Cab = mongoose.model("Cab", cabSchema);

module.exports = { Cab, packageFareSchema, cabFarePackagesSchema };
