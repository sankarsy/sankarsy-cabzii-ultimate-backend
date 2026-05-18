const mongoose = require("mongoose");

const citySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    state: { type: String, trim: true, default: "" },
    country: { type: String, trim: true, default: "India" },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 }
  },
  { timestamps: true }
);

citySchema.index({ name: 1, state: 1 }, { unique: true });

const City = mongoose.model("City", citySchema);

module.exports = { City };
