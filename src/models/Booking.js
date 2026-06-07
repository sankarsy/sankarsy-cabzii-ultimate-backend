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
    pickupTime: { type: String, trim: true, default: "" },
    routeType: { type: String, trim: true, default: "" },
    tripType: { type: String, trim: true, default: "" },
    /** MMT-style: outstation | airport | hourly | local */
    serviceTripType: { type: String, trim: true, default: "" },
    roundTrip: { type: Boolean, default: false },
    packageHours: { type: Number, default: null },
    amount: { type: Number, default: 0 },
    paymentMethod: { type: String, trim: true, default: "cash" },
    coupon: { type: String, trim: true, default: "" },
    pickupLat: { type: Number, default: null },
    pickupLng: { type: Number, default: null },
    dropLat: { type: Number, default: null },
    dropLng: { type: Number, default: null },
    distanceKm: { type: Number, default: null },
    durationMin: { type: Number, default: null },
    vendorContact: {
      name: { type: String, trim: true, default: "" },
      phone: { type: String, trim: true, default: "" },
      whatsapp: { type: String, trim: true, default: "" },
      email: { type: String, trim: true, default: "" },
      notes: { type: String, trim: true, default: "" }
    },
    contactSharedAt: { type: Date, default: null },
    finishedAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ["pending", "confirmed", "finished", "cancelled"],
      default: "pending"
    }
  },
  { timestamps: true }
);

const Booking = mongoose.model("Booking", bookingSchema);

module.exports = { Booking };
