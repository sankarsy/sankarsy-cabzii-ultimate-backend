const mongoose = require("mongoose");
const { faqItemSchema, seoMetaSchema } = require("../schemas/cmsSchemas");

const citySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, trim: true, lowercase: true },
    state: { type: String, trim: true, default: "" },
    country: { type: String, trim: true, default: "India" },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    /** Which public products this city may publish. Historical records stay if a flag is turned off. */
    services: {
      cabBooking: { type: Boolean, default: true },
      airportTaxi: { type: Boolean, default: true },
      actingDriver: { type: Boolean, default: true },
      holidayTrips: { type: Boolean, default: true }
    },
    description: { type: String, default: "", trim: true },
    metaTitle: { type: String, default: "", trim: true },
    metaDescription: { type: String, default: "", trim: true },
    keywords: { type: String, default: "", trim: true },
    content: { type: String, default: "" },
    faqs: { type: [faqItemSchema], default: [] },
    seo: { type: seoMetaSchema, default: () => ({}) },
    schemaJson: { type: String, default: "" },
    popularLocations: { type: [String], default: [] },
    airportDetails: { type: String, default: "", trim: true },
    popularRoutes: { type: [String], default: [] },
    popularPackages: { type: [String], default: [] },
    image: { type: String, default: "", trim: true },
    banner: { type: String, default: "", trim: true }
  },
  { timestamps: true }
);

citySchema.index({ name: 1, state: 1 }, { unique: true });
citySchema.index({ slug: 1 }, { unique: true, sparse: true });

const City = mongoose.model("City", citySchema);

module.exports = { City };
