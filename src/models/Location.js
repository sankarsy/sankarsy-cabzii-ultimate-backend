const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema(
  {
    city: { type: mongoose.Schema.Types.ObjectId, ref: "City", required: true, index: true },
    cityName: { type: String, trim: true, default: "" },
    name: { type: String, required: true, trim: true },
    address: { type: String, trim: true, default: "" },
    pincode: { type: String, trim: true, default: "" },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

locationSchema.index({ cityName: 1, name: 1 });

const Location = mongoose.model("Location", locationSchema);

module.exports = { Location };
