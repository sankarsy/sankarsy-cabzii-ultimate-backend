const mongoose = require("mongoose");

const searchConsoleSnapshotSchema = new mongoose.Schema(
  {
    keyword: { type: String, trim: true, default: "", index: true },
    clicks: { type: Number, default: 0, min: 0 },
    impressions: { type: Number, default: 0, min: 0 },
    ctr: { type: Number, default: 0, min: 0 },
    position: { type: Number, default: 0, min: 0 },
    landingPage: { type: String, default: "", trim: true },
    opportunityScore: { type: Number, default: 0, min: 0, max: 100 },
    snapshotDate: { type: String, default: "", trim: true },
    country: { type: String, default: "", trim: true },
    device: { type: String, default: "", trim: true },
    searchAppearance: { type: String, default: "", trim: true },
    source: {
      type: String,
      enum: ["manual", "import", "gsc_api"],
      default: "manual",
      index: true
    },
    dimension: {
      type: String,
      enum: ["page", "query", "query_page", ""],
      default: ""
    },
    property: { type: String, default: "", trim: true },
    startDate: { type: String, default: "", trim: true },
    endDate: { type: String, default: "", trim: true }
  },
  { timestamps: true }
);

searchConsoleSnapshotSchema.index({ snapshotDate: 1, position: 1 });
searchConsoleSnapshotSchema.index({ source: 1, startDate: 1, endDate: 1, landingPage: 1 });
searchConsoleSnapshotSchema.index({ landingPage: 1, source: 1 });

const SearchConsoleSnapshot = mongoose.model("SearchConsoleSnapshot", searchConsoleSnapshotSchema);
module.exports = { SearchConsoleSnapshot };
