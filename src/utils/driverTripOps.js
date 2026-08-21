"use strict";

const { HttpError } = require("./httpError");
const { bookingWindow, deriveNewOccupancyWindow } = require("./bookingAvailability");
const { bookingAssignedToDriver } = require("./driverTripAccess");

const DRIVER_START_EARLY_MS = 2 * 60 * 60 * 1000;
const DRIVER_START_LATE_MS = 2 * 60 * 60 * 1000;

function toDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function driverTripOperationalWindow(booking) {
  return bookingWindow(booking) || deriveNewOccupancyWindow(booking, { allowDistance: true });
}

function hasTripStarted(booking) {
  return Boolean(toDate(booking?.tripStartedAt));
}

function hasTripFinished(booking) {
  if (toDate(booking?.tripFinishedAt)) return true;
  return String(booking?.status || "") === "finished";
}

function assertAssignedDriver(booking, driverId) {
  if (!booking || !bookingAssignedToDriver(booking, driverId)) {
    throw new HttpError(404, "Trip not found");
  }
}

function assertWithinDriverStartWindow(booking, now = new Date()) {
  const window = driverTripOperationalWindow(booking);
  if (!window) throw new HttpError(400, "This trip does not have a valid pickup time.");
  const t = toDate(now).getTime();
  if (t < window.start.getTime() - DRIVER_START_EARLY_MS) {
    throw new HttpError(400, "This trip cannot be started yet.");
  }
  if (t > window.end.getTime() + DRIVER_START_LATE_MS) {
    throw new HttpError(400, "This trip window has closed.");
  }
}

function assertDriverCanStartTrip(booking, driverId, now = new Date()) {
  assertAssignedDriver(booking, driverId);
  const status = String(booking.status || "");
  if (status === "cancelled") throw new HttpError(400, "Cannot start a cancelled booking.");
  if (status === "finished" || hasTripFinished(booking)) {
    throw new HttpError(409, "Trip already finished.");
  }
  if (status !== "confirmed") throw new HttpError(400, "Booking must be confirmed before starting.");
  if (hasTripStarted(booking)) throw new HttpError(409, "Trip already started.");
  assertWithinDriverStartWindow(booking, now);
}

function assertDriverCanFinishTrip(booking, driverId) {
  assertAssignedDriver(booking, driverId);
  const status = String(booking.status || "");
  if (status === "cancelled") throw new HttpError(400, "Cannot finish a cancelled booking.");
  if (status === "finished" || toDate(booking.tripFinishedAt)) {
    throw new HttpError(409, "Trip already finished.");
  }
  if (status !== "confirmed") throw new HttpError(400, "Only a confirmed trip can be finished.");
  if (!hasTripStarted(booking)) throw new HttpError(400, "Start the trip before finishing it.");
}

function vendorFinishPatch(existing, now = new Date()) {
  const at = toDate(now);
  const patch = { status: "finished", finishedAt: at, expiresAt: null };
  if (!toDate(existing?.tripFinishedAt)) patch.tripFinishedAt = at;
  return patch;
}

module.exports = {
  DRIVER_START_EARLY_MS,
  DRIVER_START_LATE_MS,
  driverTripOperationalWindow,
  hasTripStarted,
  hasTripFinished,
  assertAssignedDriver,
  assertWithinDriverStartWindow,
  assertDriverCanStartTrip,
  assertDriverCanFinishTrip,
  vendorFinishPatch
};
