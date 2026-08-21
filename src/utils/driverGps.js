"use strict";

const { HttpError } = require("./httpError");
const { bookingAssignedToDriver } = require("./driverTripAccess");
const { hasTripStarted, hasTripFinished } = require("./driverTripOps");

const LOCATION_LIVE_MS = 45 * 1000;
const LOCATION_RECENT_MS = 3 * 60 * 1000;
const LOCATION_MIN_WRITE_MS = 10 * 1000;

function toDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toFiniteNumber(value) {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function locationFreshness(updatedAt, now = new Date()) {
  const at = toDate(updatedAt);
  if (!at) return "none";
  const age = toDate(now).getTime() - at.getTime();
  if (age <= LOCATION_LIVE_MS) return "live";
  if (age <= LOCATION_RECENT_MS) return "recent";
  return "stale";
}

function sanitizeLatestLocation(raw, now = new Date()) {
  if (!raw || raw.latitude == null || raw.longitude == null) {
    return { latestLocation: null, freshness: "none" };
  }
  const updatedAt = toDate(raw.updatedAt);
  const latestLocation = {
    latitude: raw.latitude,
    longitude: raw.longitude,
    accuracy: raw.accuracy ?? null,
    heading: raw.heading ?? null,
    speed: raw.speed ?? null,
    updatedAt
  };
  return { latestLocation, freshness: locationFreshness(updatedAt, now) };
}

function isGpsActiveTrip(booking) {
  if (!booking) return false;
  if (String(booking.status || "") === "cancelled") return false;
  if (String(booking.status || "") === "finished") return false;
  return hasTripStarted(booking) && !hasTripFinished(booking);
}

function assertDriverCanPingLocation(booking, driverId) {
  if (!booking || !bookingAssignedToDriver(booking, driverId)) {
    throw new HttpError(404, "Trip not found");
  }
  const status = String(booking.status || "");
  if (status === "cancelled") throw new HttpError(400, "Cannot update location for a cancelled booking.");
  if (!hasTripStarted(booking)) throw new HttpError(400, "Start the trip before sharing location.");
  if (hasTripFinished(booking) || status === "finished") {
    throw new HttpError(400, "Cannot update location after the trip has finished.");
  }
  if (status !== "confirmed") throw new HttpError(400, "Location sharing is only available on an active trip.");
}

function parseLocationPing(body = {}) {
  const latitude = toFiniteNumber(body.latitude);
  const longitude = toFiniteNumber(body.longitude);
  if (latitude == null || latitude < -90 || latitude > 90) {
    throw new HttpError(400, "Latitude must be between -90 and 90.");
  }
  if (longitude == null || longitude < -180 || longitude > 180) {
    throw new HttpError(400, "Longitude must be between -180 and 180.");
  }

  const accuracy = Object.prototype.hasOwnProperty.call(body, "accuracy") ? toFiniteNumber(body.accuracy) : null;
  if (body.accuracy != null && body.accuracy !== "" && (accuracy == null || accuracy < 0)) {
    throw new HttpError(400, "Accuracy must be 0 or greater.");
  }

  const heading = Object.prototype.hasOwnProperty.call(body, "heading") ? toFiniteNumber(body.heading) : null;
  const speed = Object.prototype.hasOwnProperty.call(body, "speed") ? toFiniteNumber(body.speed) : null;
  if (speed != null && speed < 0) throw new HttpError(400, "Speed must be 0 or greater.");

  return {
    latitude,
    longitude,
    accuracy: accuracy != null && accuracy >= 0 ? accuracy : null,
    heading,
    speed
  };
}

function shouldSkipLocationWrite(existing, now = new Date()) {
  const last = toDate(existing?.latestLocation?.updatedAt);
  if (!last) return false;
  return toDate(now).getTime() - last.getTime() < LOCATION_MIN_WRITE_MS;
}

function locationWritePatch(parsed, now = new Date()) {
  return {
    latestLocation: {
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      accuracy: parsed.accuracy,
      heading: parsed.heading,
      speed: parsed.speed,
      updatedAt: toDate(now)
    }
  };
}

function vendorCanReadTracking(booking, req) {
  if (!booking || !req?.user) return false;
  if (req.user.role === "super_admin") return true;
  if (req.user.role !== "vendor_admin") return false;
  return String(booking.vendorAdminPhone || "") === String(req.user.mobileNumber || "");
}

module.exports = {
  LOCATION_LIVE_MS,
  LOCATION_RECENT_MS,
  LOCATION_MIN_WRITE_MS,
  locationFreshness,
  sanitizeLatestLocation,
  isGpsActiveTrip,
  assertDriverCanPingLocation,
  parseLocationPing,
  shouldSkipLocationWrite,
  locationWritePatch,
  vendorCanReadTracking
};
