const mongoose = require("mongoose");

const faqItemSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true },
    answer: { type: String, default: "", trim: true }
  },
  { _id: false }
);

const seoMetaSchema = new mongoose.Schema(
  {
    metaTitle: { type: String, default: "", trim: true },
    metaDescription: { type: String, default: "", trim: true },
    keywords: { type: String, default: "", trim: true },
    canonicalUrl: { type: String, default: "", trim: true },
    robots: { type: String, default: "index,follow", trim: true },
    schemaJson: { type: String, default: "" },
    ogTitle: { type: String, default: "", trim: true },
    ogDescription: { type: String, default: "", trim: true },
    ogImage: { type: String, default: "", trim: true },
    twitterTitle: { type: String, default: "", trim: true },
    twitterDescription: { type: String, default: "", trim: true },
    twitterImage: { type: String, default: "", trim: true },
    seoScore: { type: Number, default: 0, min: 0, max: 100 }
  },
  { _id: false }
);

const faqAssignmentSchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      enum: ["global", "homepage", "city", "route", "service", "vehicle", "tour", "destination", "blog", "cms-page"],
      default: "global"
    },
    entityId: { type: String, default: "", trim: true },
    entitySlug: { type: String, default: "", trim: true }
  },
  { _id: false }
);

module.exports = { faqItemSchema, seoMetaSchema, faqAssignmentSchema };
