const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    mobileNumber: { type: String, required: true, unique: true, index: true },
    role: {
      type: String,
      enum: ["customer", "vendor_admin", "super_admin"],
      default: "customer"
    }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const User = mongoose.model("User", userSchema);

module.exports = { User };
