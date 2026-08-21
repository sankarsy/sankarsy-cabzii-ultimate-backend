"use strict";

const mongoose = require("mongoose");
const { Cab } = require("../models/Cab");
const { Driver } = require("../models/Driver");
const { HttpError } = require("./httpError");
const { isSuperAdminUser } = require("./adminAccess");
const {
  catalogOwnedByVendor,
  assertVehicleAvailable,
  assertDriverAvailable,
  tripHasStarted,
  effectiveVehicleId,
  effectiveDriverId
} = require("./bookingAvailability");

function catalogUsable(item) {
  if (!item || item.isDeleted) return false;
  if (item.status && item.status !== "active") return false;
  return true;
}

function emptyId(value) {
  return value == null || value === "" || value === "null";
}

async function loadOwnedVehicle(req, rawId) {
  if (emptyId(rawId)) return null;
  if (!mongoose.isValidObjectId(rawId)) throw new HttpError(400, "Invalid vehicle id");
  const item = await Cab.findById(rawId).lean();
  if (!item || item.isDeleted) throw new HttpError(404, "Vehicle not found");
  if (!catalogUsable(item)) throw new HttpError(400, "Vehicle is not active.");
  if (isSuperAdminUser(req)) return item;
  if (!catalogOwnedByVendor(item, req)) {
    throw new HttpError(403, "You can only assign your own vehicles.");
  }
  return item;
}

async function loadOwnedDriver(req, rawId) {
  if (emptyId(rawId)) return null;
  if (!mongoose.isValidObjectId(rawId)) throw new HttpError(400, "Invalid driver id");
  const item = await Driver.findById(rawId).lean();
  if (!item || item.isDeleted) throw new HttpError(404, "Driver not found");
  if (!catalogUsable(item)) throw new HttpError(400, "Driver is not active.");
  if (isSuperAdminUser(req)) return item;
  if (!catalogOwnedByVendor(item, req)) {
    throw new HttpError(403, "You can only assign your own drivers.");
  }
  return item;
}

function assertReassignmentAllowed(existing, { now = new Date(), allowPast = false } = {}) {
  const status = String(existing.status || "");
  if (status === "cancelled" || status === "finished") {
    throw new HttpError(400, "Cannot reassign a cancelled or finished booking.");
  }
  if (existing.tripStartedAt && !allowPast) {
    throw new HttpError(400, "Cannot reassign after the driver has started the trip.");
  }
  if (!allowPast && tripHasStarted(existing, now)) {
    throw new HttpError(400, "Cannot reassign after the trip has started.");
  }
}

async function applyAssignmentAvailability(merged, { excludeId, now } = {}) {
  if (effectiveVehicleId(merged)) {
    await assertVehicleAvailable(merged, { excludeId, now });
  }
  if (effectiveDriverId(merged)) {
    await assertDriverAvailable(merged, { excludeId, now });
  }
}

module.exports = {
  catalogUsable,
  loadOwnedVehicle,
  loadOwnedDriver,
  assertReassignmentAllowed,
  applyAssignmentAvailability
};
