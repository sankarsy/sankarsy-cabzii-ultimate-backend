const mongoose = require("mongoose");

const vendorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    slug: { type: String, trim: true, index: true },
    contactPhone: { type: String, trim: true, default: "" },
    contactEmail: { type: String, trim: true, default: "" },
    adminPhone: { type: String, trim: true, default: "", index: true },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

vendorSchema.pre("save", function setSlug(next) {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
  next();
});

const Vendor = mongoose.model("Vendor", vendorSchema);

module.exports = { Vendor };
