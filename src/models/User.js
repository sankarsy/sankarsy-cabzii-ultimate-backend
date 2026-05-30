const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    mobileNumber: { type: String, required: true, unique: true, index: true },
    name: { type: String, default: "" },
    email: { type: String, default: "" },
    role: {
      type: String,
      enum: ["customer", "vendor_admin", "super_admin"],
      default: "customer"
    },
    isBlocked: { type: Boolean, default: false },
    lastLoginAt: { type: Date, default: null },
    loginCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

module.exports = { User };
