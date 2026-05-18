const mongoose = require("mongoose");

const packageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    vendor: { type: String, required: true, trim: true },
    vendorAdminPhone: { type: String, default: "" },
    duration: { type: String, required: true, trim: true },
    price: { type: Number, required: true },
    originalPrice: { type: Number, default: 0 },
    discountPercentage: { type: Number, default: 0 },
    hourlyRate: { type: Number, default: 0 },
    dayRate: { type: Number, default: 0 },
    extraHourRate: { type: Number, default: 0 },
    image: { type: String, default: "" },
    tags: { type: [String], default: [] },
    seo: { type: String, default: "" },
    seoTitle: { type: String, default: "" },
    seoDescription: { type: String, default: "" }
  },
  { timestamps: true }
);

const Package = mongoose.model("Package", packageSchema);

module.exports = { Package };
