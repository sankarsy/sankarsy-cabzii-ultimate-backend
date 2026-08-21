"use strict";

const mongoose = require("mongoose");
const { Booking } = require("../models/Booking");
const { Cab } = require("../models/Cab");
const { HttpError } = require("../utils/httpError");
const { istYmd } = require("../utils/bookingAvailability");
const { logAudit } = require("../services/auditService");
const {
  driverTripListFilter,
  bookingAssignedToDriver,
  sanitizeDriverTrip,
  classifyDriverTrips
} = require("../utils/driverTripAccess");
const {
  assertDriverCanStartTrip,
  assertDriverCanFinishTrip
} = require("../utils/driverTripOps");
const { setDriverAvailability } = require("../utils/callDriverBooking");
const {
  assertDriverCanPingLocation,
  parseLocationPing,
  shouldSkipLocationWrite,
  locationWritePatch,
  sanitizeLatestLocation
} = require("../utils/driverGps");

async function vehicleTitleMap(ids) {
  const unique = [...new Set((ids || []).filter(Boolean).map(String))].filter((id) =>
    mongoose.isValidObjectId(id)
  );
  if (!unique.length) return {};
  const cabs = await Cab.find({ _id: { $in: unique } })
    .select("title vehicleName vehicleModel")
    .lean();
  return Object.fromEntries(
    cabs.map((cab) => [
      String(cab._id),
      cab.title || cab.vehicleName || cab.vehicleModel || ""
    ])
  );
}

function toDriverTrip(booking, titles) {
  const vehicleId = booking.assignedVehicleId ? String(booking.assignedVehicleId) : "";
  return sanitizeDriverTrip(booking, {
    assignedVehicleTitle: vehicleId ? titles[vehicleId] || "" : "",
    tracking: sanitizeLatestLocation(booking.latestLocation)
  });
}

async function listDriverTrips(req, res) {
  const driverId = req.driver?._id;
  if (!driverId) throw new HttpError(403, "Driver authentication required.");

  const today = istYmd();
  const rows = await Booking.find(driverTripListFilter(driverId, today))
    .sort({ date: 1, pickupTime: 1 })
    .lean();

  const titles = await vehicleTitleMap(rows.map((row) => row.assignedVehicleId));
  const trips = rows.map((row) => toDriverTrip(row, titles));
  res.json({ success: true, data: classifyDriverTrips(trips, today) });
}

async function getDriverTrip(req, res) {
  const driverId = req.driver?._id;
  if (!driverId) throw new HttpError(403, "Driver authentication required.");
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, "Invalid booking id");

  const booking = await Booking.findById(req.params.id).lean();
  if (!booking || !bookingAssignedToDriver(booking, driverId)) {
    throw new HttpError(404, "Trip not found");
  }

  const titles = await vehicleTitleMap([booking.assignedVehicleId]);
  res.json({ success: true, data: toDriverTrip(booking, titles) });
}

async function startDriverTrip(req, res) {
  const driverId = req.driver?._id;
  if (!driverId) throw new HttpError(403, "Driver authentication required.");
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, "Invalid booking id");

  const booking = await Booking.findById(req.params.id);
  if (!booking) throw new HttpError(404, "Trip not found");

  const now = new Date();
  assertDriverCanStartTrip(booking.toObject(), driverId, now);

  const data = await Booking.findOneAndUpdate(
    {
      _id: booking._id,
      assignedDriverId: driverId,
      status: "confirmed",
      $or: [{ tripStartedAt: null }, { tripStartedAt: { $exists: false } }]
    },
    { $set: { tripStartedAt: now, "callDriver.opsStatus": "trip_started" } },
    { new: true }
  );
  if (!data) throw new HttpError(409, "Trip already started.");
  await setDriverAvailability(driverId, "on_trip");

  await logAudit({
    req,
    action: "driver_start_trip",
    entity: "booking",
    entityId: data._id,
    meta: { tripStartedAt: data.tripStartedAt }
  });

  const titles = await vehicleTitleMap([data.assignedVehicleId]);
  res.json({ success: true, message: "Trip started.", data: toDriverTrip(data.toObject(), titles) });
}

async function finishDriverTrip(req, res) {
  const driverId = req.driver?._id;
  if (!driverId) throw new HttpError(403, "Driver authentication required.");
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, "Invalid booking id");

  const booking = await Booking.findById(req.params.id);
  if (!booking) throw new HttpError(404, "Trip not found");

  const now = new Date();
  assertDriverCanFinishTrip(booking.toObject(), driverId);

  const data = await Booking.findOneAndUpdate(
    {
      _id: booking._id,
      assignedDriverId: driverId,
      status: "confirmed",
      tripStartedAt: { $ne: null },
      $or: [{ tripFinishedAt: null }, { tripFinishedAt: { $exists: false } }]
    },
    { $set: { tripFinishedAt: now, finishedAt: now, status: "finished", expiresAt: null, "callDriver.opsStatus": "trip_completed" } },
    { new: true }
  );
  if (!data) throw new HttpError(409, "Trip already finished.");
  await setDriverAvailability(driverId, "available");

  await logAudit({
    req,
    action: "driver_finish_trip",
    entity: "booking",
    entityId: data._id,
    meta: { tripFinishedAt: data.tripFinishedAt, status: data.status }
  });

  const titles = await vehicleTitleMap([data.assignedVehicleId]);
  res.json({ success: true, message: "Trip finished.", data: toDriverTrip(data.toObject(), titles) });
}

async function pingDriverTripLocation(req, res) {
  const driverId = req.driver?._id;
  if (!driverId) throw new HttpError(403, "Driver authentication required.");
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, "Invalid booking id");

  const parsed = parseLocationPing(req.body || {});
  const booking = await Booking.findById(req.params.id);
  if (!booking) throw new HttpError(404, "Trip not found");

  const now = new Date();
  assertDriverCanPingLocation(booking.toObject(), driverId);

  if (shouldSkipLocationWrite(booking.toObject(), now)) {
    const titles = await vehicleTitleMap([booking.assignedVehicleId]);
    return res.json({
      success: true,
      data: toDriverTrip(booking.toObject(), titles)
    });
  }

  const data = await Booking.findOneAndUpdate(
    {
      _id: booking._id,
      assignedDriverId: driverId,
      status: "confirmed",
      tripStartedAt: { $ne: null },
      $or: [{ tripFinishedAt: null }, { tripFinishedAt: { $exists: false } }]
    },
    { $set: locationWritePatch(parsed, now) },
    { new: true }
  );
  if (!data) throw new HttpError(400, "Location sharing is only available on an active trip.");

  const titles = await vehicleTitleMap([data.assignedVehicleId]);
  res.json({ success: true, data: toDriverTrip(data.toObject(), titles) });
}

module.exports = { listDriverTrips, getDriverTrip, startDriverTrip, finishDriverTrip, pingDriverTripLocation };
