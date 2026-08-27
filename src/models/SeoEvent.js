const mongoose = require("mongoose");

/** First-party SEO funnel events. No phone, email, or customer identifiers. */
const seoEventSchema = new mongoose.Schema(
  {
    eventName: {
      type: String,
      enum: ["seo_page_view", "booking_started", "booking_completed"],
      required: true,
      index: true
    },
    landingPage: { type: String, required: true, trim: true, index: true },
    pageType: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "", index: true },
    service: { type: String, trim: true, default: "" },
    origin: { type: String, trim: true, default: "" },
    destination: { type: String, trim: true, default: "" },
    route: { type: String, trim: true, default: "" },
    sessionId: { type: String, trim: true, default: "", index: true },
    viewedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

seoEventSchema.index({ createdAt: 1, eventName: 1 });
seoEventSchema.index({ landingPage: 1, createdAt: 1 });

const SeoEvent = mongoose.model("SeoEvent", seoEventSchema);
module.exports = { SeoEvent };
