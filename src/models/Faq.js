const mongoose = require("mongoose");
const { faqAssignmentSchema } = require("../schemas/cmsSchemas");

const faqSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true, trim: true },
    category: { type: String, default: "general", trim: true },
    tags: { type: [String], default: [] },
    assignments: { type: [faqAssignmentSchema], default: [] },
    sortOrder: { type: Number, default: 0 },
    published: { type: Boolean, default: true }
  },
  { timestamps: true }
);

faqSchema.index({ category: 1, sortOrder: 1 });
faqSchema.index({ "assignments.entityType": 1, "assignments.entitySlug": 1 });

const Faq = mongoose.model("Faq", faqSchema);

module.exports = { Faq };
