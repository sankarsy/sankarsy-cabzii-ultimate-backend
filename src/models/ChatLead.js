const mongoose = require("mongoose");

const chatLeadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    mobile: { type: String, required: true, trim: true, match: /^[6-9]\d{9}$/ },
    source: { type: String, default: "zii-chatbot", trim: true },
    userAgent: { type: String, default: "" },
    ip: { type: String, default: "" }
  },
  { timestamps: true }
);

chatLeadSchema.index({ mobile: 1, createdAt: -1 });
chatLeadSchema.index({ createdAt: -1 });

const ChatLead = mongoose.model("ChatLead", chatLeadSchema);

module.exports = { ChatLead };
