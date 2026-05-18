const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    phone: { type: String, required: true, unique: true, index: true },
    role: { type: String, enum: ["customer", "vendor_admin", "super_admin"], default: "customer" },
    vendorName: { type: String, default: "" }
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

module.exports = { User };
