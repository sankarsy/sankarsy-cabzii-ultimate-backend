"use strict";

const mongoose = require("mongoose");
const { istYmd } = require("./bookingAvailability");

const DRIVER_TRIP_STATUSES = ["pending", "confirmed", "finished", "cancelled"];

function driverTripQuery(driverId) {
  if (!driverId || !mongoose.isValidObjectId(driverId)) {
    return { _id: new mongoose.Types.ObjectId("000000000000000000000000") };
  }
  return { assignedDriverId: driverId };
}

function bookingAssignedToDriver(booking, driverId) {
  if (!booking || !driverId) return false;
  return String(booking.assignedDriverId || "") === String(driverId);
}

function sanitizeDriverTrip(booking = {}, extras = {}) {
  return {
    _id: booking._id,
    date: booking.date || "",
    pickupTime: booking.pickupTime || "",
    pickup: booking.pickup || "",
    drop: booking.drop || "",
    customerName: booking.customerName || "",
    customerPhone: booking.phone || "",
    assignedVehicleId: booking.assignedVehicleId || null,
    assignedVehicleTitle: extras.assignedVehicleTitle || "",
    serviceTripType: booking.serviceTripType || booking.tripType || "",
    tripType: booking.tripType || "",
    packageId: booking.packageId || "",
    packageHours: booking.packageHours ?? null,
    roundTrip: Boolean(booking.roundTrip),
    status: booking.status || "",
    startAt: booking.startAt || null,
    endAt: booking.endAt || null,
    tripStartedAt: booking.tripStartedAt || null,
    tripFinishedAt: booking.tripFinishedAt || null,
    tracking: extras.tracking || null
  };
}

function isCurrentDriverTrip(row) {
  if (String(row.status || "") !== "confirmed") return false;
  if (!row.tripStartedAt) return false;
  return !row.tripFinishedAt;
}

function classifyDriverTrips(rows, today = istYmd()) {
  const todayTrips = [];
  const upcomingTrips = [];
  const current = [];
  for (const row of rows) {
    if (isCurrentDriverTrip(row)) current.push(row);
    const date = String(row.date || "");
    if (date === today) todayTrips.push(row);
    else if (date > today) upcomingTrips.push(row);
  }
  return { today: todayTrips, upcoming: upcomingTrips, current };
}

function driverTripListFilter(driverId, today = istYmd()) {
  return {
    ...driverTripQuery(driverId),
    $or: [
      { status: { $in: ["pending", "confirmed"] }, date: { $gte: today } },
      {
        status: "confirmed",
        tripStartedAt: { $ne: null },
        $or: [{ tripFinishedAt: null }, { tripFinishedAt: { $exists: false } }]
      }
    ]
  };
}

function isDriverForbiddenBookingField(key) {
  return [
    "vendor",
    "vendorAdminPhone",
    "vendorContact",
    "amount",
    "baseFare",
    "discount",
    "tax",
    "fees",
    "finalAmount",
    "pricingSource",
    "coupon",
    "couponCode",
    "user",
    "latestLocation"
  ].includes(key);
}

const BOOKING_ASSIGN_ROLES = ["super_admin", "vendor_admin"];

function canMutateBookingAssignment(role) {
  return BOOKING_ASSIGN_ROLES.includes(role);
}

module.exports = {
  DRIVER_TRIP_STATUSES,
  driverTripQuery,
  driverTripListFilter,
  bookingAssignedToDriver,
  sanitizeDriverTrip,
  classifyDriverTrips,
  isCurrentDriverTrip,
  isDriverForbiddenBookingField,
  BOOKING_ASSIGN_ROLES,
  canMutateBookingAssignment
};
