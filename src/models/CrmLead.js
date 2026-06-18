const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    author: { type: String, default: "admin", trim: true }
  },
  { timestamps: true }
);

const callLogSchema = new mongoose.Schema(
  {
    outcome: { type: String, default: "", trim: true },
    durationMinutes: { type: Number, default: 0, min: 0 },
    notes: { type: String, default: "", trim: true }
  },
  { timestamps: true }
);

const crmLeadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    mobile: { type: String, required: true, trim: true, match: /^[6-9]\d{9}$/ },
    email: { type: String, default: "", trim: true },
    source: { type: String, default: "website", trim: true },
    stage: {
      type: String,
      enum: ["new", "contacted", "quotation_sent", "follow_up", "confirmed", "completed", "lost"],
      default: "new",
      index: true
    },
    route: { type: String, default: "", trim: true },
    vehicleType: { type: String, default: "", trim: true },
    estimatedFare: { type: Number, default: 0, min: 0 },
    assignedTo: { type: String, default: "", trim: true },
    followUpAt: { type: Date, default: null },
    whatsappSent: { type: Boolean, default: false },
    notes: { type: [noteSchema], default: [] },
    callLogs: { type: [callLogSchema], default: [] },
    chatLeadId: { type: mongoose.Schema.Types.ObjectId, ref: "ChatLead", default: null },
    repeatCustomer: { type: Boolean, default: false }
  },
  { timestamps: true }
);

crmLeadSchema.index({ mobile: 1, createdAt: -1 });
crmLeadSchema.index({ stage: 1, followUpAt: 1 });

const CrmLead = mongoose.model("CrmLead", crmLeadSchema);

module.exports = { CrmLead };
