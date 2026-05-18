const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    customerName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true, index: true },
    email: { type: String, trim: true, default: "" },
    type: { type: String, enum: ["cab", "driver", "tour"], required: true },
    itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
    pickup: { type: String, trim: true, default: "" },
    drop: { type: String, trim: true, default: "" },
    date: { type: String, trim: true, default: "" },
    routeType: { type: String, trim: true, default: "" },
    tripType: { type: String, trim: true, default: "" },
    amount: { type: Number, default: 0 },
    status: { type: String, enum: ["pending", "confirmed", "cancelled"], default: "pending" }
  },
  { timestamps: true }
);

const Booking = mongoose.model("Booking", bookingSchema);

module.exports = { Booking };
