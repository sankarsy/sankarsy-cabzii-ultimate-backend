const mongoose = require("mongoose");
const { faqItemSchema } = require("../schemas/cmsSchemas");

/** Ranking-style custom landing at /pages/{slug}. Created from Google SEO pages admin. */
const seoLandingSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
    h1: { type: String, required: true, trim: true },
    intro: { type: String, default: "", trim: true },
    body: { type: String, default: "" },
    seoTitle: { type: String, required: true, trim: true },
    seoDescription: { type: String, default: "", trim: true },
    seo: { type: String, default: "", trim: true },
    faqs: { type: [faqItemSchema], default: [] },
    schemaJson: { type: String, default: "" },
    ctaHref: { type: String, default: "/cabs", trim: true },
    ctaLabel: { type: String, default: "Book now", trim: true },
    published: { type: Boolean, default: true }
  },
  { timestamps: true }
);

const SeoLanding = mongoose.model("SeoLanding", seoLandingSchema);

module.exports = { SeoLanding };
