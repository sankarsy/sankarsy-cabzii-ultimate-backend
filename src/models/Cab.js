const mongoose = require("mongoose");

const cabSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    vendor: { type: String, required: true, trim: true },
    vendorAdminPhone: { type: String, default: "" },
    type: { type: String, required: true, trim: true },
    seats: { type: Number, default: 4 },
    price: { type: Number, required: true },
    hourlyRate: { type: Number, default: 0 },
    dayRate: { type: Number, default: 0 },
    extraHourRate: { type: Number, default: 0 },
    originalPrice: { type: Number, default: 0 },
    discountPercentage: { type: Number, default: 0 },
    rating: { type: Number },
    image: { type: String, default: "" },
    features: { type: [String], default: [] },
    seo: { type: String, default: "" },
    seoTitle: { type: String, default: "" },
    seoDescription: { type: String, default: "" }
  },
  { timestamps: true }
);

const Cab = mongoose.model("Cab", cabSchema);

module.exports = { Cab };
