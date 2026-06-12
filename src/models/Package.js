const mongoose = require("mongoose");
const { mongooseFields: catalogProductFields } = require("../utils/catalogProductFields");

const packageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    vendor: { type: String, required: true, trim: true },
    vendorAdminPhone: { type: String, default: "" },
    duration: { type: String, default: "", trim: true },
    /* ── Tour-package extension (all optional; legacy packages unaffected) ── */
    /** Open string (not enum) so new vendor service categories need no migration. */
    packageType: { type: String, default: "", trim: true, index: true },
    state: { type: String, default: "", trim: true },
    destination: { type: String, default: "", trim: true },
    nights: { type: Number, default: 0, min: 0 },
    days: { type: Number, default: 0, min: 0 },
    description: { type: String, default: "" },
    highlights: { type: [String], default: [] },
    inclusions: { type: [String], default: [] },
    exclusions: { type: [String], default: [] },
    termsAndConditions: { type: String, default: "" },
    cancellationPolicy: { type: String, default: "" },
    itinerary: {
      type: [
        {
          day: { type: Number, default: 1 },
          title: { type: String, default: "" },
          details: { type: String, default: "" }
        }
      ],
      default: []
    },
    faqs: {
      type: [
        {
          question: { type: String, default: "" },
          answer: { type: String, default: "" }
        }
      ],
      default: []
    },
    price: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, default: 0, min: 0 },
    discountPercentage: { type: Number, default: 0, min: 0, max: 99 },
    hourlyRate: { type: Number, default: 0, min: 0 },
    dayRate: { type: Number, default: 0, min: 0 },
    extraHourRate: { type: Number, default: 0, min: 0 },
    image: { type: String, default: "" },
    gallery: { type: [String], default: [] },
    city: { type: String, default: "", trim: true, index: true },
    location: { type: String, default: "", trim: true },
    tags: { type: [String], default: [] },
    category: {
      type: String,
      enum: ["pilgrimage", "beach", "hill", "heritage", "honeymoon", "adventure", "family", ""],
      default: "",
      index: true
    },
    cabTypes: {
      type: [
        {
          id: { type: String, default: "" },
          label: { type: String, default: "" },
          seats: { type: Number, default: 4 },
          multiplier: { type: Number, default: 1 }
        }
      ],
      default: []
    },
    seo: { type: String, default: "" },
    seoTitle: { type: String, default: "" },
    seoDescription: { type: String, default: "" },
    ...catalogProductFields,
    status: { type: String, enum: ["active", "inactive"], default: "active", index: true },
    isDeleted: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

const Package = mongoose.model("Package", packageSchema);

module.exports = { Package };
