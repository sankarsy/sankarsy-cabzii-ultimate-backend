"use strict";

const { HttpError } = require("./httpError");
const { bookingOwnedByUser } = require("./bookingQuery");
const {
  locationFreshness,
  sanitizeLatestLocation,
  vendorCanReadTracking
} = require("./driverGps");
const { hasTripStarted, hasTripFinished } = require("./driverTripOps");

const TRACKING_STATES = {
  LIVE: "live",
  RECENT: "recent",
  STALE: "stale",
  NOT_STARTED: "not_started",
  FINISHED: "finished"
};

function isTrackableBookingType(type) {
  return type === "cab" || type === "driver";
}

function trackingDisplayState(booking, now = new Date()) {
  if (!booking) return TRACKING_STATES.NOT_STARTED;
  const status = String(booking.status || "");
  if (status === "cancelled") return TRACKING_STATES.NOT_STARTED;
  if (hasTripFinished(booking) || status === "finished") return TRACKING_STATES.FINISHED;
  if (status !== "confirmed" || !hasTripStarted(booking)) return TRACKING_STATES.NOT_STARTED;
  const freshness = locationFreshness(booking.latestLocation?.updatedAt, now);
  if (freshness === "none") return TRACKING_STATES.NOT_STARTED;
  return freshness;
}

function shouldPollTracking(booking, now = new Date()) {
  const status = String(booking?.status || "");
  if (status === "cancelled" || status === "finished") return false;
  const state = trackingDisplayState(booking, now);
  if (state === TRACKING_STATES.FINISHED) return false;
  return (
    state === TRACKING_STATES.LIVE ||
    state === TRACKING_STATES.RECENT ||
    state === TRACKING_STATES.STALE ||
    state === TRACKING_STATES.NOT_STARTED
  );
}

function assertCanReadBookingLocation(booking, req) {
  if (!req?.user) throw new HttpError(401, "Authentication required");
  if (req.user.role === "driver") {
    throw new HttpError(403, "Drivers must use /driver/trips for assigned trips.");
  }
  if (!booking) throw new HttpError(404, "Booking not found");
  if (req.user.role === "super_admin") return;
  if (req.user.role === "vendor_admin") {
    if (!vendorCanReadTracking(booking, req)) throw new HttpError(404, "Booking not found");
    return;
  }
  if (!bookingOwnedByUser(booking, req.user)) {
    throw new HttpError(404, "Booking not found");
  }
}

function customerLocationPayload(booking = {}, extras = {}, now = new Date()) {
  const state = trackingDisplayState(booking, now);
  const status = String(booking.status || "");
  const tracking = sanitizeLatestLocation(booking.latestLocation, now);
  const exposePoint =
    (state === TRACKING_STATES.LIVE ||
      state === TRACKING_STATES.RECENT ||
      state === TRACKING_STATES.STALE ||
      state === TRACKING_STATES.FINISHED) &&
    status !== "cancelled";

  let freshness = exposePoint ? tracking.freshness : "none";
  if (state === TRACKING_STATES.FINISHED) freshness = TRACKING_STATES.FINISHED;

  return {
    bookingId: booking._id,
    type: booking.type || "",
    status,
    trackingState: state,
    poll: shouldPollTracking(booking, now) && status !== "cancelled",
    latestLocation: exposePoint ? tracking.latestLocation : null,
    freshness,
    pickup: booking.pickup || "",
    drop: booking.drop || "",
    pickupLat: booking.pickupLat ?? null,
    pickupLng: booking.pickupLng ?? null,
    dropLat: booking.dropLat ?? null,
    dropLng: booking.dropLng ?? null,
    driverName: extras.driverName || "",
    vehicleTitle: extras.vehicleTitle || "",
    tripStartedAt: booking.tripStartedAt || null,
    tripFinishedAt: booking.tripFinishedAt || null
  };
}

module.exports = {
  TRACKING_STATES,
  isTrackableBookingType,
  trackingDisplayState,
  shouldPollTracking,
  assertCanReadBookingLocation,
  customerLocationPayload
};
