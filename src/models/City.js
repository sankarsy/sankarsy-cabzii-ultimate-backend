const mongoose = require("mongoose");
const { faqItemSchema, seoMetaSchema } = require("../schemas/cmsSchemas");

const citySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, trim: true, lowercase: true, sparse: true, index: true },
    state: { type: String, trim: true, default: "" },
    country: { type: String, trim: true, default: "India" },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
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

const City = mongoose.model("City", citySchema);

module.exports = { City };
