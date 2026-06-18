const mongoose = require("mongoose");

const searchConsoleSnapshotSchema = new mongoose.Schema(
  {
    keyword: { type: String, required: true, trim: true, index: true },
    clicks: { type: Number, default: 0, min: 0 },
    impressions: { type: Number, default: 0, min: 0 },
    ctr: { type: Number, default: 0, min: 0 },
    position: { type: Number, default: 0, min: 0 },
    landingPage: { type: String, default: "", trim: true },
    opportunityScore: { type: Number, default: 0, min: 0, max: 100 },
    snapshotDate: { type: String, default: "", trim: true }
  },
  { timestamps: true }
);

searchConsoleSnapshotSchema.index({ snapshotDate: 1, position: 1 });

const SearchConsoleSnapshot = mongoose.model("SearchConsoleSnapshot", searchConsoleSnapshotSchema);

module.exports = { SearchConsoleSnapshot };
