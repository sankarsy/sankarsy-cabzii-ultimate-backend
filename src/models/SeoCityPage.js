const mongoose = require("mongoose");

/** Per-city SEO meta for /cab-booking/{city} and /acting-driver/{city}. */
const seoCityPageSchema = new mongoose.Schema(
  {
    pageType: {
      type: String,
      required: true,
      enum: ["cab-booking", "acting-driver"],
      trim: true
    },
    citySlug: { type: String, required: true, trim: true, lowercase: true },
    seoTitle: { type: String, required: true, trim: true },
    seoDescription: { type: String, default: "", trim: true },
    seo: { type: String, default: "" },
    h1: { type: String, default: "", trim: true },
    body: { type: String, default: "" },
    published: { type: Boolean, default: true }
  },
  { timestamps: true }
);

seoCityPageSchema.index({ pageType: 1, citySlug: 1 }, { unique: true });

const SeoCityPage = mongoose.model("SeoCityPage", seoCityPageSchema);

module.exports = { SeoCityPage };
