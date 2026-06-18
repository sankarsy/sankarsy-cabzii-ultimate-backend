const mongoose = require("mongoose");

const mediaAssetSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    filename: { type: String, default: "", trim: true },
    alt: { type: String, default: "", trim: true },
    title: { type: String, default: "", trim: true },
    folder: { type: String, default: "general", trim: true },
    tags: { type: [String], default: [] },
    mimeType: { type: String, default: "", trim: true },
    sizeBytes: { type: Number, default: 0, min: 0 },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 }
  },
  { timestamps: true }
);

mediaAssetSchema.index({ folder: 1, createdAt: -1 });
mediaAssetSchema.index({ tags: 1 });

const MediaAsset = mongoose.model("MediaAsset", mediaAssetSchema);

module.exports = { MediaAsset };
