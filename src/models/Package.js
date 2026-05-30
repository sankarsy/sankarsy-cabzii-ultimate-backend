const mongoose = require("mongoose");

const packageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    vendor: { type: String, required: true, trim: true },
    vendorAdminPhone: { type: String, default: "" },
    duration: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, default: 0, min: 0 },
    discountPercentage: { type: Number, default: 0, min: 0, max: 99 },
    hourlyRate: { type: Number, default: 0, min: 0 },
    dayRate: { type: Number, default: 0, min: 0 },
    extraHourRate: { type: Number, default: 0, min: 0 },
    image: { type: String, default: "" },
    gallery: { type: [String], default: [] },
    city: { type: String, default: "", trim: true, index: true },
    location: { type: String, default: "", trim: true },
    tags: { type: [String], default: [] },
    seo: { type: String, default: "" },
    seoTitle: { type: String, default: "" },
    seoDescription: { type: String, default: "" },
    status: { type: String, enum: ["active", "inactive"], default: "active", index: true },
    isDeleted: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

const Package = mongoose.model("Package", packageSchema);

module.exports = { Package };
