const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema(
  {
    section: {
      type: String,
      enum: ["offers", "services", "routes"],
      default: "offers",
      index: true
    },
    tag: { type: String, trim: true, default: "" },
    title: { type: String, required: true, trim: true },
    desc: { type: String, trim: true, default: "" },
    iconKey: {
      type: String,
      enum: ["car", "holiday", "route", "airport", "driver"],
      default: "car"
    },
    color: { type: String, trim: true, default: "from-[var(--cabzii-brand)] to-blue-500" },
    image: { type: String, trim: true, default: "" },
    href: { type: String, trim: true, default: "/cabs" },
    code: { type: String, trim: true, default: "" },
    fare: { type: String, trim: true, default: "" },
    validTill: { type: String, trim: true, default: "" },
    sortOrder: { type: Number, default: 0 },
    published: { type: Boolean, default: true }
  },
  { timestamps: true }
);

offerSchema.index({ section: 1, published: 1, sortOrder: 1 });

const Offer = mongoose.model("Offer", offerSchema);

module.exports = { Offer };
