const mongoose = require("mongoose");
const { faqItemSchema, seoMetaSchema } = require("../schemas/cmsSchemas");

const cmsPageSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
    title: { type: String, required: true, trim: true },
    pageType: {
      type: String,
      enum: ["about", "contact", "privacy", "terms", "refund", "cancellation", "legal", "custom"],
      default: "custom"
    },
    excerpt: { type: String, default: "", trim: true },
    body: { type: String, default: "" },
    faqs: { type: [faqItemSchema], default: [] },
    seo: { type: seoMetaSchema, default: () => ({}) },
    seoTitle: { type: String, default: "", trim: true },
    seoDescription: { type: String, default: "", trim: true },
    published: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 }
  },
  { timestamps: true }
);

const CmsPage = mongoose.model("CmsPage", cmsPageSchema);

module.exports = { CmsPage };
