const mongoose = require("mongoose");

const seoTemplateSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true, lowercase: true },
    label: { type: String, required: true, trim: true },
    templateType: {
      type: String,
      enum: ["city", "route", "service", "blog", "destination", "cms-page", "vehicle", "tour"],
      default: "city"
    },
    titleTemplate: { type: String, required: true, trim: true },
    descriptionTemplate: { type: String, default: "", trim: true },
    keywordsTemplate: { type: String, default: "", trim: true },
    schemaTemplate: { type: String, default: "" },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 }
  },
  { timestamps: true }
);

const SeoTemplate = mongoose.model("SeoTemplate", seoTemplateSchema);

module.exports = { SeoTemplate };
