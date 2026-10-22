const mongoose = require("mongoose");

const routeFareSchema = new mongoose.Schema(
  {
    fromCitySlug: { type: String, required: true, trim: true, index: true },
    toCitySlug: { type: String, required: true, trim: true, index: true },
    fromName: { type: String, default: "", trim: true },
    toName: { type: String, default: "", trim: true },
    hatchback: { type: Number, default: 0, min: 0 },
    sedan: { type: Number, default: 0, min: 0 },
    suv: { type: Number, default: 0, min: 0 },
    van: { type: Number, default: 0, min: 0 }
  },
  { timestamps: true }
);

routeFareSchema.index({ fromCitySlug: 1, toCitySlug: 1 }, { unique: true });

const RouteFare = mongoose.model("RouteFare", routeFareSchema);

module.exports = { RouteFare };
