const mongoose = require("mongoose");

/**
 * Verified customer review — can only be created against a finished booking.
 * One review per booking. Public display requires admin approval.
 */
const reviewSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true, unique: true },
    itemType: { type: String, enum: ["cab", "driver"], required: true },
    itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
    customerName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    /** Trip date shown alongside the review (from the booking). */
    bookingDate: { type: String, trim: true, default: "" },
    /** e.g. "Airport transfer — Chennai Airport → T Nagar" */
    serviceUsed: { type: String, trim: true, default: "" },
    rating: { type: Number, required: true, min: 1, max: 5 },
    text: { type: String, trim: true, default: "", maxlength: 2000 },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true }
  },
  { timestamps: true }
);

reviewSchema.index({ itemType: 1, itemId: 1, status: 1 });

const Review = mongoose.model("Review", reviewSchema);

module.exports = { Review };
