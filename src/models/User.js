const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    mobileNumber: { type: String, required: true, unique: true, index: true },
    role: {
      type: String,
      enum: ["customer", "vendor_admin", "super_admin"],
      default: "customer"
    },
    name: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, default: "" },
    lastLoginAt: { type: Date, default: null },
    loginCount: { type: Number, default: 0, min: 0 }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const User = mongoose.model("User", userSchema);

module.exports = { User };
