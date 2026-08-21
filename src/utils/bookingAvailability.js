"use strict";

const mongoose = require("mongoose");
const { Booking } = require("../models/Booking");
const { HttpError } = require("./httpError");
const { isSuperAdminUser } = require("./adminAccess");
const { isVendorAdmin } = require("./vendorBookingAccess");
const { isCatalogAdmin } = require("./listQuery");

const ACTIVE_RESERVATION_STATUSES = ["pending", "confirmed"];
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const OCCUPANCY_SELECT =
  "itemId date pickupTime packageHours packageId status type roundTrip startAt endAt expiresAt distanceKm assignedVehicleId assignedDriverId";

/** Cash checkout creates pending immediately; there is no payment-gateway timeout. */
const PENDING_HOLD_MS_CASH = 4 * 60 * 60 * 1000;
const PENDING_HOLD_MS_ONLINE = 15 * 60 * 1000;
const OUTSTATION_SPEED_KMH = 40;
const HOUR_MS = 60 * 60 * 1000;

const VEHICLE_UNAVAILABLE =
  "This vehicle is no longer available for the selected time. Please choose another vehicle.";
const DRIVER_UNAVAILABLE =
  "This driver is no longer available for the selected time. Please choose another driver.";
const HOLD_EXPIRED =
  "This booking hold has expired. The vehicle is no longer reserved.";

function isAvailabilityType(type) {
  return type === "cab" || type === "driver";
}

function isActiveReservation(status) {
  return ACTIVE_RESERVATION_STATUSES.includes(String(status || ""));
}

function isCashLikePayment(method) {
  const m = String(method || "cash").toLowerCase();
  return m === "cash" || m === "pay_at_drop";
}

function toDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** pending blocks only while the hold is still open. Historical pending with no expiresAt still block. */
function isReservationBlocking(row = {}, now = new Date()) {
  const status = String(row.status || "");
  if (status === "confirmed") return true;
  if (status !== "pending") return false;
  const expiresAt = toDate(row.expiresAt);
  if (!expiresAt) return true;
  return expiresAt.getTime() > toDate(now).getTime();
}

function pendingHoldMs(paymentMethod) {
  return isCashLikePayment(paymentMethod) ? PENDING_HOLD_MS_CASH : PENDING_HOLD_MS_ONLINE;
}

function computePendingExpiresAt(now, startAt, paymentMethod) {
  const holdEnd = new Date(toDate(now).getTime() + pendingHoldMs(paymentMethod));
  const start = toDate(startAt);
  if (start && start.getTime() < holdEnd.getTime()) return start;
  return holdEnd;
}

function unavailableMessage(type) {
  return type === "driver" ? DRIVER_UNAVAILABLE : VEHICLE_UNAVAILABLE;
}

function normalizeTime(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const m = raw.match(/^([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/);
  if (!m) return "";
  return `${String(m[1]).padStart(2, "0")}:${m[2]}`;
}

function isValidDateString(value) {
  const m = String(value || "").trim().match(DATE_RE);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

function parseIst(dateStr, timeStr) {
  if (!isValidDateString(dateStr)) return null;
  const time = normalizeTime(timeStr) || "00:00";
  const d = new Date(`${dateStr}T${time}:00+05:30`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function istYmd(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function endOfIstDay(dateStr) {
  const startNext = parseIst(dateStr, "00:00");
  if (!startNext) return null;
  return new Date(startNext.getTime() + 24 * 60 * 60 * 1000);
}

/**
 * Occupancy length from stored booking fields only.
 * Does not trust client durationMin (can be shortened to dodge overlap).
 * Hourly/local packages use packageHours or packageId.
 * Historical outstation without startAt/endAt still uses remainder of pickup IST day.
 */
function deriveHistoricalOccupancyMs(booking = {}) {
  const hours = Number(booking.packageHours);
  if (Number.isFinite(hours) && hours > 0) return Math.round(hours * 60) * 60 * 1000;

  const pkg = String(booking.packageId || "");
  if (pkg === "local_4hr") return 4 * HOUR_MS;
  if (pkg === "local_1day" || pkg === "local_8hr") return 8 * HOUR_MS;

  return null;
}

function isOutstationBooking(booking = {}) {
  const tripType = String(booking.serviceTripType || booking.tripType || "").toLowerCase();
  const pkg = String(booking.packageId || "");
  if (tripType === "outstation") return true;
  return pkg === "outstation_oneway" || pkg === "outstation_twoway";
}

function isRoundTripBooking(booking = {}) {
  if (booking.roundTrip === true) return true;
  return String(booking.packageId || "") === "outstation_twoway";
}

/**
 * Server occupancy for NEW bookings and search.
 * Outstation uses a documented window (distance heuristic or 12h/24h) — not rest-of-day.
 * Client durationMin is ignored even if present.
 */
function deriveNewOccupancyMs(booking = {}, { allowDistance = false } = {}) {
  void booking.durationMin;
  const hours = Number(booking.packageHours);
  if (Number.isFinite(hours) && hours > 0) return Math.round(hours * 60) * 60 * 1000;

  const pkg = String(booking.packageId || "");
  if (pkg === "local_4hr") return 4 * HOUR_MS;
  if (pkg === "local_1day" || pkg === "local_8hr") return 8 * HOUR_MS;

  if (isOutstationBooking(booking)) {
    const km = allowDistance ? Number(booking.distanceKm) : NaN;
    const roundTrip = isRoundTripBooking(booking);
    if (Number.isFinite(km) && km > 0) {
      const driveHours = km / OUTSTATION_SPEED_KMH;
      const oneWayHours = Math.max(3, Math.ceil(driveHours) + 1);
      const totalHours = roundTrip ? Math.max(8, oneWayHours * 2) : oneWayHours;
      return totalHours * HOUR_MS;
    }
    return (roundTrip ? 24 : 12) * HOUR_MS;
  }

  return 4 * HOUR_MS;
}

function windowFromStartAndMs(start, occupancyMs, source) {
  if (!start || occupancyMs == null) return null;
  return { start, end: new Date(start.getTime() + occupancyMs), source };
}

function storedOccupancyWindow(booking = {}) {
  const start = toDate(booking.startAt);
  const end = toDate(booking.endAt);
  if (!start || !end || !(end.getTime() > start.getTime())) return null;
  return { start, end, source: "stored" };
}

/**
 * Occupancy for a persisted booking.
 * New rows use startAt/endAt. Historical rows without those fields keep Wave 2 derivation.
 */
function bookingWindow(booking = {}) {
  const stored = storedOccupancyWindow(booking);
  if (stored) return stored;

  if (!isValidDateString(booking.date)) return null;
  const time = normalizeTime(booking.pickupTime);
  const start = parseIst(booking.date, time || "00:00");
  if (!start) return null;

  const occupancyMs = deriveHistoricalOccupancyMs(booking);
  if (occupancyMs != null) {
    return windowFromStartAndMs(start, occupancyMs, "package");
  }

  const dayEnd = endOfIstDay(booking.date);
  return { start, end: dayEnd, source: "date-remainder" };
}

function deriveNewOccupancyWindow(booking = {}, options = {}) {
  if (!isValidDateString(booking.date)) return null;
  const time = normalizeTime(booking.pickupTime);
  const start = parseIst(booking.date, time || "00:00");
  if (!start) return null;
  const occupancyMs = deriveNewOccupancyMs(booking, options);
  const source = isOutstationBooking(booking) && !(Number(booking.packageHours) > 0) ? "outstation" : "package";
  return windowFromStartAndMs(start, occupancyMs, source);
}

function windowsOverlap(a, b) {
  if (!a || !b) return false;
  return a.start < b.end && a.end > b.start;
}

function sameResource(a = {}, b = {}) {
  return String(a.type || "") === String(b.type || "") && String(a.itemId || "") === String(b.itemId || "");
}

function idStr(value) {
  if (value == null || value === "") return "";
  return String(value);
}

/** Cab occupancy key: assigned vehicle if set, otherwise the booked catalog cab. */
function effectiveVehicleId(booking = {}) {
  if (booking.assignedVehicleId) return idStr(booking.assignedVehicleId);
  if (booking.type === "cab") return idStr(booking.itemId);
  return "";
}

/** Driver occupancy key: assigned driver, or the booked driver catalog item. */
function effectiveDriverId(booking = {}) {
  if (booking.assignedDriverId) return idStr(booking.assignedDriverId);
  if (booking.type === "driver") return idStr(booking.itemId);
  return "";
}

function requestWindow(request) {
  return (
    storedOccupancyWindow(request) ||
    deriveNewOccupancyWindow(request, { allowDistance: true }) ||
    bookingWindow(request)
  );
}

function collectBlockingForVehicle(rows, vehicleId, request, { excludeId, now } = {}) {
  const vid = idStr(vehicleId);
  const window = requestWindow(request);
  if (!vid || !window) return [];
  const at = now || new Date();
  return (rows || []).filter((row) => {
    if (excludeId != null && idStr(row._id) === idStr(excludeId)) return false;
    if (!isReservationBlocking(row, at)) return false;
    if (effectiveVehicleId(row) !== vid) return false;
    const other = bookingWindow(row);
    return windowsOverlap(window, other);
  });
}

function collectBlockingForDriver(rows, driverId, request, { excludeId, now } = {}) {
  const did = idStr(driverId);
  const window = requestWindow(request);
  if (!did || !window) return [];
  const at = now || new Date();
  return (rows || []).filter((row) => {
    if (excludeId != null && idStr(row._id) === idStr(excludeId)) return false;
    if (!isReservationBlocking(row, at)) return false;
    if (effectiveDriverId(row) !== did) return false;
    const other = bookingWindow(row);
    return windowsOverlap(window, other);
  });
}

function stampCreateAssignments(payload) {
  if (!payload || !isAvailabilityType(payload.type)) return payload;
  if (payload.type === "cab" && payload.itemId && !payload.assignedVehicleId) {
    payload.assignedVehicleId = payload.itemId;
  }
  if (payload.type === "driver" && payload.itemId && !payload.assignedDriverId) {
    payload.assignedDriverId = payload.itemId;
  }
  return payload;
}

function assertPendingHoldValid(booking, now = new Date()) {
  if (String(booking?.status) !== "pending") return;
  if (isReservationBlocking(booking, now)) return;
  throw new HttpError(409, HOLD_EXPIRED);
}

function tripHasStarted(booking, now = new Date()) {
  const window = bookingWindow(booking) || deriveNewOccupancyWindow(booking, { allowDistance: true });
  if (!window) return false;
  return window.start.getTime() <= toDate(now).getTime();
}

function istDatesCovered(window) {
  if (!window) return [];
  const dates = [];
  let day = parseIst(istYmd(window.start), "00:00");
  const lastDay = parseIst(istYmd(new Date(window.end.getTime() - 1)), "00:00");
  if (!day || !lastDay) return [istYmd(window.start)];
  while (day.getTime() <= lastDay.getTime()) {
    dates.push(istYmd(day));
    day = new Date(day.getTime() + 24 * 60 * 60 * 1000);
  }
  return dates;
}

function queryDatesForWindow(window) {
  const dates = istDatesCovered(window);
  if (!window || !dates.length) return dates;
  const startDay = parseIst(istYmd(window.start), "00:00");
  if (!startDay) return dates;
  const prevYmd = istYmd(new Date(startDay.getTime() - 24 * 60 * 60 * 1000));
  if (!dates.includes(prevYmd)) dates.unshift(prevYmd);
  return dates;
}

function requestedWindowFromInput(input = {}) {
  return deriveNewOccupancyWindow({
    date: input.date,
    pickupTime: input.pickupTime || input.time,
    packageHours: input.packageHours,
    packageId: input.packageId,
    serviceTripType: input.serviceTripType,
    tripType: input.tripType,
    roundTrip: input.roundTrip
  });
}

function stampCabDriverSchedule(payload, { now = new Date() } = {}) {
  if (!payload || !isAvailabilityType(payload.type)) return payload;
  const window = deriveNewOccupancyWindow(payload, { allowDistance: true });
  if (window) {
    payload.startAt = window.start;
    payload.endAt = window.end;
  }
  if (String(payload.status) === "pending") {
    payload.expiresAt = computePendingExpiresAt(now, window?.start, payload.paymentMethod);
  } else {
    payload.expiresAt = null;
  }
  return payload;
}

function occupancyPatchForStatus(status, booking, { now = new Date() } = {}) {
  if (status === "confirmed" || status === "finished" || status === "cancelled") {
    return { expiresAt: null };
  }
  if (status === "pending") {
    const window = bookingWindow(booking) || deriveNewOccupancyWindow(booking, { allowDistance: true });
    return { expiresAt: computePendingExpiresAt(now, window?.start, booking.paymentMethod) };
  }
  return {};
}

function validateCabDriverSchedule(value, { allowPast = false } = {}) {
  if (!isAvailabilityType(value.type)) return;

  if (!value.date || !String(value.date).trim()) {
    throw new HttpError(400, "Pickup date is required.");
  }
  if (!isValidDateString(value.date)) {
    throw new HttpError(400, "Invalid pickup date.");
  }
  if (!value.pickupTime || !normalizeTime(value.pickupTime)) {
    throw new HttpError(400, "Valid pickup time is required.");
  }

  const window = bookingWindow(value);
  if (!window) throw new HttpError(400, "Invalid date/time combination.");

  if (!allowPast && window.start.getTime() < Date.now()) {
    throw new HttpError(400, "Pickup date and time cannot be in the past.");
  }
}

function blockingQuery(type, itemId, window, excludeId, now = new Date()) {
  const dates = queryDatesForWindow(window);
  const at = toDate(now);
  const query = {
    type,
    itemId,
    $or: [
      { status: "confirmed" },
      { status: "pending", expiresAt: { $gt: at } },
      { status: "pending", expiresAt: null },
      { status: "pending", expiresAt: { $exists: false } }
    ]
  };
  if (dates.length) query.date = { $in: dates };
  if (excludeId && mongoose.isValidObjectId(excludeId)) {
    query._id = { $ne: excludeId };
  }
  return query;
}

function reservationStatusOr(now = new Date()) {
  const at = toDate(now);
  return [
    { status: "confirmed" },
    { status: "pending", expiresAt: { $gt: at } },
    { status: "pending", expiresAt: null },
    { status: "pending", expiresAt: { $exists: false } }
  ];
}

function vehicleOccupancyQuery(vehicleId, window, excludeId, now = new Date()) {
  const dates = queryDatesForWindow(window);
  if (!mongoose.isValidObjectId(vehicleId)) {
    return { _id: new mongoose.Types.ObjectId("000000000000000000000000") };
  }
  const vid = vehicleId;
  const query = {
    type: "cab",
    $and: [
      { $or: reservationStatusOr(now) },
      {
        $or: [
          { assignedVehicleId: vid },
          { assignedVehicleId: null, itemId: vid },
          { assignedVehicleId: { $exists: false }, itemId: vid }
        ]
      }
    ]
  };
  if (dates.length) query.date = { $in: dates };
  if (excludeId && mongoose.isValidObjectId(excludeId)) query._id = { $ne: excludeId };
  return query;
}

function driverOccupancyQuery(driverId, window, excludeId, now = new Date()) {
  const dates = queryDatesForWindow(window);
  if (!mongoose.isValidObjectId(driverId)) {
    return { _id: new mongoose.Types.ObjectId("000000000000000000000000") };
  }
  const did = driverId;
  const query = {
    $and: [
      { $or: reservationStatusOr(now) },
      {
        $or: [
          { type: "cab", assignedDriverId: did },
          { type: "driver", assignedDriverId: did },
          { type: "driver", assignedDriverId: null, itemId: did },
          { type: "driver", assignedDriverId: { $exists: false }, itemId: did }
        ]
      }
    ]
  };
  if (dates.length) query.date = { $in: dates };
  if (excludeId && mongoose.isValidObjectId(excludeId)) query._id = { $ne: excludeId };
  return query;
}

function firstOverlapping(candidates, window, { excludeId, now } = {}) {
  const skip = excludeId != null ? String(excludeId) : "";
  const at = now || new Date();
  for (const row of candidates) {
    if (skip && String(row._id || "") === skip) continue;
    if (!isReservationBlocking(row, at)) continue;
    const other = bookingWindow(row);
    if (!other) continue;
    if (windowsOverlap(window, other)) return row;
  }
  return null;
}

function collectBlockingReservations(rows, request, { excludeId, now } = {}) {
  const window = storedOccupancyWindow(request) || deriveNewOccupancyWindow(request, { allowDistance: true }) || bookingWindow(request);
  if (!window || !isAvailabilityType(request.type) || !request.itemId) return [];
  const at = now || new Date();
  return (rows || []).filter((row) => {
    if (!sameResource(row, request)) return false;
    if (!isReservationBlocking(row, at)) return false;
    if (excludeId != null && String(row._id || "") === String(excludeId)) return false;
    const other = bookingWindow(row);
    if (!other) return false;
    return windowsOverlap(window, other);
  });
}

async function findBlockingBooking({ type, itemId, window, excludeId, session }) {
  if (!isAvailabilityType(type) || !itemId || !window) return null;
  if (type === "cab") {
    return findBlockingVehicle({ vehicleId: itemId, window, excludeId, session });
  }
  return findBlockingDriver({ driverId: itemId, window, excludeId, session });
}

async function findBlockingVehicle({ vehicleId, window, excludeId, session, now }) {
  if (!vehicleId || !window) return null;
  const query = vehicleOccupancyQuery(vehicleId, window, excludeId, now);
  const q = Booking.find(query).select(OCCUPANCY_SELECT);
  if (session) q.session(session);
  const list = await q.lean();
  return firstOverlapping(Array.isArray(list) ? list : [], window, { excludeId, now });
}

async function findBlockingDriver({ driverId, window, excludeId, session, now }) {
  if (!driverId || !window) return null;
  const query = driverOccupancyQuery(driverId, window, excludeId, now);
  const q = Booking.find(query).select(OCCUPANCY_SELECT);
  if (session) q.session(session);
  const list = await q.lean();
  return firstOverlapping(Array.isArray(list) ? list : [], window, { excludeId, now });
}

async function assertVehicleAvailable(input, { excludeId, session, now } = {}) {
  const window = bookingWindow(input) || deriveNewOccupancyWindow(input, { allowDistance: true });
  const vehicleId = effectiveVehicleId(input);
  if (!window || !vehicleId) return;
  const blocking = await findBlockingVehicle({ vehicleId, window, excludeId, session, now });
  if (blocking) throw new HttpError(409, VEHICLE_UNAVAILABLE);
}

async function assertDriverAvailable(input, { excludeId, session, now } = {}) {
  const window = bookingWindow(input) || deriveNewOccupancyWindow(input, { allowDistance: true });
  const driverId = effectiveDriverId(input);
  if (!window || !driverId) return;
  const blocking = await findBlockingDriver({ driverId, window, excludeId, session, now });
  if (blocking) throw new HttpError(409, DRIVER_UNAVAILABLE);
}

async function assertItemAvailable(input, { excludeId, session, now } = {}) {
  if (!isAvailabilityType(input.type)) return;
  if (input.type === "cab") {
    await assertVehicleAvailable(input, { excludeId, session, now });
    if (effectiveDriverId(input)) await assertDriverAvailable(input, { excludeId, session, now });
    return;
  }
  await assertDriverAvailable(input, { excludeId, session, now });
  if (effectiveVehicleId(input)) await assertVehicleAvailable(input, { excludeId, session, now });
}

function catalogOwnedByVendor(item, req) {
  if (!item || !req?.user) return false;
  return String(item.vendorAdminPhone || "") === String(req.user.mobileNumber || "");
}

function assertVendorOwnsBookableItem(req, type, item) {
  if (isSuperAdminUser(req)) return;
  if (!isVendorAdmin(req)) return;
  if (catalogOwnedByVendor(item, req)) return;
  throw new HttpError(
    403,
    type === "driver"
      ? "You can only assign your own drivers."
      : "You can only book your own vehicles."
  );
}

async function findBusyItemIds(type, window) {
  if (!isAvailabilityType(type) || !window) return [];
  const dates = queryDatesForWindow(window);
  const at = new Date();
  const typeFilter = type === "driver" ? { type: { $in: ["cab", "driver"] } } : { type: "cab" };
  const rows = await Booking.find({
    ...typeFilter,
    date: { $in: dates },
    $or: reservationStatusOr(at)
  })
    .select(OCCUPANCY_SELECT)
    .lean();

  const busy = [];
  const seen = new Set();
  for (const row of rows) {
    if (!isReservationBlocking(row, at)) continue;
    const other = bookingWindow(row);
    if (!windowsOverlap(window, other)) continue;
    const id = type === "driver" ? effectiveDriverId(row) : effectiveVehicleId(row);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    busy.push(id);
  }
  return busy;
}

function applyBusyIdFilter(filter, busyIds) {
  if (!busyIds?.length) return filter;
  const nin = { _id: { $nin: busyIds } };
  if (!filter || !Object.keys(filter).length) return nin;
  return { $and: [filter, nin] };
}

async function publicAvailabilityFilter(type, req, filter) {
  if (isCatalogAdmin(req) && String(req.query?.admin || "") === "1") return filter;
  const window = requestedWindowFromInput({
    date: req.query?.date,
    pickupTime: req.query?.time || req.query?.pickupTime,
    packageHours: req.query?.packageHours,
    packageId: req.query?.packageId,
    serviceTripType: req.query?.serviceTripType,
    roundTrip: req.query?.roundTrip === "true" || req.query?.roundTrip === true
  });
  if (!window) return filter;
  const busyIds = await findBusyItemIds(type, window);
  return applyBusyIdFilter(filter, busyIds);
}

function isHttpConflict(err) {
  let cur = err;
  for (let i = 0; i < 4 && cur; i += 1) {
    if (cur instanceof HttpError) return true;
    const code = Number(cur.statusCode);
    if (code === 409 || code === 400) return true;
    const msg = String(cur.message || "");
    if (msg === VEHICLE_UNAVAILABLE || msg === DRIVER_UNAVAILABLE || msg === HOLD_EXPIRED) return true;
    cur = cur.cause || cur.originalError;
  }
  return false;
}

function asHttpConflict(err) {
  let cur = err;
  for (let i = 0; i < 4 && cur; i += 1) {
    if (cur instanceof HttpError) return cur;
    cur = cur.cause || cur.originalError;
  }
  const msg = String(err?.message || "");
  if (msg === DRIVER_UNAVAILABLE) return new HttpError(409, DRIVER_UNAVAILABLE);
  if (msg === HOLD_EXPIRED) return new HttpError(409, HOLD_EXPIRED);
  if (msg === VEHICLE_UNAVAILABLE || Number(err?.statusCode) === 409) {
    return new HttpError(409, msg || VEHICLE_UNAVAILABLE);
  }
  if (Number(err?.statusCode) === 400) return new HttpError(400, msg);
  return new HttpError(409, VEHICLE_UNAVAILABLE);
}

function isTransactionUnsupported(err) {
  const msg = String(err?.message || err?.errmsg || "");
  const code = err?.code;
  return (
    code === 20 ||
    code === 263 ||
    /Transaction numbers are only allowed/i.test(msg) ||
    /transactions are not supported/i.test(msg) ||
    /Transaction.*not supported|not supported.*transaction/i.test(msg)
  );
}

async function insertBooking(payload, session) {
  if (session) return (await Booking.create([payload], { session }))[0];
  return Booking.create(payload);
}

/**
 * Availability is re-checked after the insert is visible.
 * A same-document unique index cannot express overlapping time ranges, so this
 * post-insert recheck (delete-on-conflict) is the concurrency guard.
 * MongoDB transactions abort the insert on a pre-check 409; they do not by
 * themselves serialize two inserts of different Booking documents.
 */
async function createBookingWithAvailability(payload) {
  if (!isAvailabilityType(payload.type)) {
    return Booking.create(payload);
  }

  const window = bookingWindow(payload) || deriveNewOccupancyWindow(payload, { allowDistance: true });

  async function insertAfterPrecheck(session) {
    if (window) await assertItemAvailable(payload, { session });
    return insertBooking(payload, session);
  }

  let created;
  try {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        created = await insertAfterPrecheck(session);
      });
    } finally {
      await session.endSession();
    }
  } catch (err) {
    if (isHttpConflict(err)) throw asHttpConflict(err);
    if (!isTransactionUnsupported(err)) throw err;
    created = await insertAfterPrecheck(null);
  }

  if (window && created?._id) {
    try {
      const createdObj = created.toObject ? created.toObject() : created;
      await assertItemAvailable(createdObj, { excludeId: created._id });
    } catch (err) {
      await Booking.deleteOne({ _id: created._id });
      throw asHttpConflict(err);
    }
  }

  return created;
}

module.exports = {
  ACTIVE_RESERVATION_STATUSES,
  VEHICLE_UNAVAILABLE,
  DRIVER_UNAVAILABLE,
  HOLD_EXPIRED,
  isAvailabilityType,
  isActiveReservation,
  normalizeTime,
  isValidDateString,
  parseIst,
  istYmd,
  deriveHistoricalOccupancyMs,
  deriveOccupancyMs: deriveHistoricalOccupancyMs,
  deriveNewOccupancyMs,
  deriveNewOccupancyWindow,
  bookingWindow,
  windowsOverlap,
  sameResource,
  effectiveVehicleId,
  effectiveDriverId,
  collectBlockingForVehicle,
  collectBlockingForDriver,
  stampCreateAssignments,
  assertPendingHoldValid,
  tripHasStarted,
  assertVehicleAvailable,
  assertDriverAvailable,
  queryDatesForWindow,
  requestedWindowFromInput,
  stampCabDriverSchedule,
  occupancyPatchForStatus,
  computePendingExpiresAt,
  isReservationBlocking,
  PENDING_HOLD_MS_CASH,
  PENDING_HOLD_MS_ONLINE,
  validateCabDriverSchedule,
  blockingQuery,
  firstOverlapping,
  collectBlockingReservations,
  findBlockingBooking,
  assertItemAvailable,
  catalogOwnedByVendor,
  assertVendorOwnsBookableItem,
  findBusyItemIds,
  applyBusyIdFilter,
  publicAvailabilityFilter,
  createBookingWithAvailability
};
