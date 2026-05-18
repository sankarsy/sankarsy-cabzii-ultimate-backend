const mongoose = require("mongoose");

const otpSessionSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, index: true },
    otp: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: true },
    consumedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

const OtpSession = mongoose.model("OtpSession", otpSessionSchema);

module.exports = { OtpSession };
