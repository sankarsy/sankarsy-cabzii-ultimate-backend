const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    customerName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true, index: true },
    email: { type: String, trim: true, default: "" },
    type: { type: String, enum: ["cab", "driver", "tour", "bus"], required: true },
    itemId: { type: mongoose.Schema.Types.ObjectId, default: null },
    /** Call Driver / Acting Driver service booking (no customer-selected driver). */
    callDriver: {
      serviceType: { type: String, trim: true, default: "" },
      vehicleType: { type: String, trim: true, default: "" },
      vehicleModel: { type: String, trim: true, default: "" },
      hours: { type: Number, default: null },
      days: { type: Number, default: null },
      estimatedKm: { type: Number, default: null },
      pickupTime: { type: String, trim: true, default: "" },
      returnDate: { type: String, trim: true, default: "" },
      airport: { type: String, trim: true, default: "" },
      airportDirection: { type: String, trim: true, default: "" },
      schoolName: { type: String, trim: true, default: "" },
      schoolShift: { type: String, trim: true, default: "" },
      workingDays: { type: Number, default: null },
      parentContact: { type: String, trim: true, default: "" },
      companyName: { type: String, trim: true, default: "" },
      contactPerson: { type: String, trim: true, default: "" },
      driversRequired: { type: Number, default: null },
      supervisorCount: { type: Number, default: 0 },
      workingHours: { type: String, trim: true, default: "" },
      notes: { type: String, trim: true, default: "" },
      eventLocation: { type: String, trim: true, default: "" },
      quoteRequested: { type: Boolean, default: false },
      opsStatus: {
        type: String,
        enum: [
          "",
          "pending",
          "confirmed",
          "driver_assigned",
          "driver_on_the_way",
          "driver_arrived",
          "trip_started",
          "trip_completed",
          "cancelled"
        ],
        default: ""
      },
      quoteSnapshot: { type: mongoose.Schema.Types.Mixed, default: null }
    },
    busMeta: {
      tripId: { type: String, trim: true, default: "" },
      operator: { type: String, trim: true, default: "" },
      seats: { type: [String], default: [] },
      boardingPoint: { type: String, trim: true, default: "" },
      droppingPoint: { type: String, trim: true, default: "" },
      busType: { type: String, trim: true, default: "" },
      fromCity: { type: String, trim: true, default: "" },
      toCity: { type: String, trim: true, default: "" },
      passengers: { type: mongoose.Schema.Types.Mixed, default: [] },
      tripGuarantee: { type: Boolean, default: false }
    },
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
    baseFare: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    fees: { type: Number, default: 0 },
    finalAmount: { type: Number, default: 0 },
    pricingSource: { type: String, trim: true, default: "" },
    couponCode: { type: String, trim: true, default: "" },
    vendor: { type: String, trim: true, default: "", index: true },
    vendorAdminPhone: { type: String, trim: true, default: "", index: true },
    packageId: { type: String, trim: true, default: "" },
    cabType: { type: String, trim: true, default: "" },
    persons: { type: Number, default: null },
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
    /** Catalog listing the customer booked. Occupancy uses assignedVehicleId when set. */
    assignedVehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Cab", default: null, index: true },
    /** Driver dispatched on a cab booking (or the booked driver for type=driver). */
    assignedDriverId: { type: mongoose.Schema.Types.ObjectId, ref: "Driver", default: null, index: true },
    contactSharedAt: { type: Date, default: null },
    finishedAt: { type: Date, default: null },
    /** Driver tapped Start. Null on historical bookings; not a new booking status. */
    tripStartedAt: { type: Date, default: null },
    /** Driver or vendor/admin completed the trip. Null on historical bookings. */
    tripFinishedAt: { type: Date, default: null },
    /** Latest foreground GPS ping while the trip is active. Overwritten in place; no history. */
    latestLocation: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      accuracy: { type: Number, default: null },
      heading: { type: Number, default: null },
      speed: { type: Number, default: null },
      updatedAt: { type: Date, default: null }
    },
    /** Occupancy window for new cab/driver bookings. Historical rows stay null (not backfilled). */
    startAt: { type: Date, default: null },
    endAt: { type: Date, default: null },
    /** Pending hold expiry. Confirmed/finished/cancelled bookings must leave this null. */
    expiresAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ["pending", "confirmed", "finished", "cancelled"],
      default: "pending"
    }
  },
  { timestamps: true }
);

bookingSchema.index({ type: 1, itemId: 1, status: 1, date: 1 });
bookingSchema.index({ assignedVehicleId: 1, status: 1, date: 1 });
bookingSchema.index({ assignedDriverId: 1, status: 1, date: 1 });

const Booking = mongoose.model("Booking", bookingSchema);

module.exports = { Booking };
