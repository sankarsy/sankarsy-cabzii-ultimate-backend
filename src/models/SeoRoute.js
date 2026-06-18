const mongoose = require("mongoose");
const { faqItemSchema, seoMetaSchema } = require("../schemas/cmsSchemas");

const seoRouteSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true, index: true },
    title: { type: String, required: true, trim: true },
    fromCitySlug: { type: String, required: true, trim: true },
    toCitySlug: { type: String, required: true, trim: true },
    distance: { type: String, default: "", trim: true },
    duration: { type: String, default: "", trim: true },
    popularStops: { type: [String], default: [] },
    sedanFrom: { type: Number, default: 0, min: 0 },
    suvFrom: { type: Number, default: 0, min: 0 },
    body: { type: String, default: "" },
    highlights: { type: [String], default: [] },
    faqs: { type: [faqItemSchema], default: [] },
    images: { type: [String], default: [] },
    seo: { type: String, default: "" },
    seoTitle: { type: String, default: "" },
    seoDescription: { type: String, default: "" },
    seoMeta: { type: seoMetaSchema, default: () => ({}) },
    schemaJson: { type: String, default: "" },
    published: { type: Boolean, default: true },
    showInMenu: { type: Boolean, default: false },
    menuLabel: { type: String, default: "", trim: true },
    menuSortOrder: { type: Number, default: 0 }
  },
  { timestamps: true }
);

const SeoRoute = mongoose.model("SeoRoute", seoRouteSchema);

module.exports = { SeoRoute };
