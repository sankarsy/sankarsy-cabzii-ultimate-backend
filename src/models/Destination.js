const mongoose = require("mongoose");
const { faqItemSchema, seoMetaSchema } = require("../schemas/cmsSchemas");

const destinationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
    state: { type: String, default: "", trim: true },
    description: { type: String, default: "" },
    body: { type: String, default: "" },
    image: { type: String, default: "", trim: true },
    banner: { type: String, default: "", trim: true },
    gallery: { type: [String], default: [] },
    faqs: { type: [faqItemSchema], default: [] },
    seo: { type: seoMetaSchema, default: () => ({}) },
    seoTitle: { type: String, default: "", trim: true },
    seoDescription: { type: String, default: "", trim: true },
    relatedRouteSlugs: { type: [String], default: [] },
    relatedPackageIds: { type: [String], default: [] },
    featured: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    published: { type: Boolean, default: true }
  },
  { timestamps: true }
);

const Destination = mongoose.model("Destination", destinationSchema);

module.exports = { Destination };
