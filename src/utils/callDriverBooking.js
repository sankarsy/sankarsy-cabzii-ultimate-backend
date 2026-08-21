"use strict";

const { Driver } = require("../models/Driver");

const DRIVER_AVAILABILITY = ["available", "assigned", "on_trip", "offline", "inactive"];

const CALL_DRIVER_OPS_STATUSES = [
  "pending",
  "confirmed",
  "driver_assigned",
  "driver_on_the_way",
  "driver_arrived",
  "trip_started",
  "trip_completed",
  "cancelled"
];

const CALL_DRIVER_LABELS = {
  local: "Local Chennai Call Driver",
  outstation: "Outstation Call Driver",
  airport: "Airport Call Driver",
  school: "Monthly / School Driver",
  corporate: "Corporate Driver",
  valet: "Valet Parking Driver"
};

function isCallDriverPayload(value) {
  return value?.type === "driver" && Boolean(value?.callDriver?.serviceType);
}

function callDriverServiceLabel(serviceType) {
  return CALL_DRIVER_LABELS[String(serviceType || "")] || "Call Driver Service";
}

function customerDriverLabel(booking, assignedDriver) {
  if (assignedDriver?.name) return assignedDriver.name;
  if (booking?.callDriver?.serviceType) return "Professional Cabzii Driver";
  return booking?.itemTitle || "";
}

function resolveDriverOpsStatus(booking) {
  const stored = String(booking?.callDriver?.opsStatus || "").trim();
  if (CALL_DRIVER_OPS_STATUSES.includes(stored)) return stored;
  const status = String(booking?.status || "");
  if (status === "cancelled") return "cancelled";
  if (status === "finished") return "trip_completed";
  if (booking?.tripStartedAt) return "trip_started";
  if (booking?.assignedDriverId) return "driver_assigned";
  if (status === "confirmed") return "confirmed";
  return "pending";
}

async function setDriverAvailability(driverId, availabilityStatus) {
  if (!driverId) return;
  if (!DRIVER_AVAILABILITY.includes(availabilityStatus)) return;
  const patch = { availabilityStatus };
  if (availabilityStatus === "inactive") patch.status = "inactive";
  if (availabilityStatus === "available") patch.status = "active";
  await Driver.updateOne({ _id: driverId, isDeleted: { $ne: true } }, { $set: patch });
}

module.exports = {
  DRIVER_AVAILABILITY,
  CALL_DRIVER_OPS_STATUSES,
  CALL_DRIVER_LABELS,
  isCallDriverPayload,
  callDriverServiceLabel,
  customerDriverLabel,
  resolveDriverOpsStatus,
  setDriverAvailability
};
