const mongoose = require("mongoose");

const driverSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    vendor: { type: String, default: "" },
    vendorAdminPhone: { type: String, default: "" },
    experience: { type: String, default: "0 Years" },
    trips: { type: Number, default: 0 },
    rating: { type: String, default: "0.0" },
    languages: { type: [String], default: [] },
    supportedVehicles: { type: [String], default: [] },
    pricing: {
      hourly: { type: Number, default: 0 },
      day: { type: Number, default: 0 },
      extraHour: { type: Number, default: 0 }
    },
    seo: { type: String, default: "" },
    seoTitle: { type: String, default: "" },
    seoDescription: { type: String, default: "" }
  },
  { timestamps: true }
);

const Driver = mongoose.model("Driver", driverSchema);

module.exports = { Driver };
