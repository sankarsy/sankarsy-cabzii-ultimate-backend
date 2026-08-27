const mongoose = require("mongoose");

/**
 * Super-admin operational notes for SEO money pages.
 * Not Google volumes. Vendor supply notes are human-entered.
 */
const seoPageInsightSchema = new mongoose.Schema(
  {
    landingPage: { type: String, required: true, trim: true, unique: true, index: true },
    pageType: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    service: { type: String, trim: true, default: "" },
    origin: { type: String, trim: true, default: "" },
    destination: { type: String, trim: true, default: "" },
    route: { type: String, trim: true, default: "" },
    vendorSupplyNote: {
      type: String,
      enum: ["", "unknown", "low", "adequate", "strong"],
      default: "unknown"
    },
    investFlag: { type: Boolean, default: false },
    recommendation: {
      type: String,
      enum: ["", "keep", "improve_content", "add_vendors", "review_indexation"],
      default: ""
    },
    notes: { type: String, trim: true, default: "" }
  },
  { timestamps: true }
);

const SeoPageInsight = mongoose.model("SeoPageInsight", seoPageInsightSchema);
module.exports = { SeoPageInsight };
