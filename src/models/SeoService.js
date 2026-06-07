const mongoose = require("mongoose");

const seoServiceSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    primaryKeyword: { type: String, default: "", trim: true },
    searchQuery: { type: String, default: "", trim: true },
    priceFrom: { type: Number, default: 0, min: 0 },
    highlights: { type: [String], default: [] },
    body: { type: String, default: "" },
    seo: { type: String, default: "" },
    seoTitle: { type: String, default: "" },
    seoDescription: { type: String, default: "" },
    published: { type: Boolean, default: true },
    showInMenu: { type: Boolean, default: false },
    menuLabel: { type: String, default: "", trim: true },
    menuSortOrder: { type: Number, default: 0 },
    menuCitySlug: { type: String, default: "chennai", trim: true },
    allCities: { type: Boolean, default: true },
    citySlugs: { type: [String], default: [] }
  },
  { timestamps: true }
);

const SeoService = mongoose.model("SeoService", seoServiceSchema);

module.exports = { SeoService };
