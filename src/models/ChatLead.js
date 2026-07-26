const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true, trim: true, maxlength: 2000 },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const chatLeadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80, default: "Guest" },
    mobile: { type: String, required: true, trim: true, match: /^[6-9]\d{9}$/ },
    source: { type: String, default: "zii-chatbot", trim: true },
    userAgent: { type: String, default: "" },
    ip: { type: String, default: "" },
    messages: { type: [chatMessageSchema], default: [] },
    lastUserMessage: { type: String, default: "", trim: true, maxlength: 500 },
    lastMessageAt: { type: Date, default: null },
    messageCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

chatLeadSchema.index({ mobile: 1, createdAt: -1 });
chatLeadSchema.index({ createdAt: -1 });
chatLeadSchema.index({ lastMessageAt: -1 });

const ChatLead = mongoose.model("ChatLead", chatLeadSchema);

module.exports = { ChatLead };
