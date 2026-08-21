"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  ACTIVE_RESERVATION_STATUSES,
  VEHICLE_UNAVAILABLE,
  DRIVER_UNAVAILABLE,
  isAvailabilityType,
  isValidDateString,
  normalizeTime,
  bookingWindow,
  windowsOverlap,
  collectBlockingReservations,
  firstOverlapping,
  validateCabDriverSchedule,
  assertVendorOwnsBookableItem,
  applyBusyIdFilter,
  catalogOwnedByVendor,
  istYmd,
  deriveNewOccupancyMs,
  deriveNewOccupancyWindow,
  stampCabDriverSchedule,
  computePendingExpiresAt,
  isReservationBlocking,
  PENDING_HOLD_MS_CASH
} = require("./bookingAvailability");
const { HttpError } = require("./httpError");

const CAB_A = "64a00000000000000000000a";
const CAB_B = "64b00000000000000000000b";
const DRV_A = "64c00000000000000000000c";
const DRV_B = "64d00000000000000000000d";

function cabBooking(overrides = {}) {
  return {
    _id: "b1",
    type: "cab",
    itemId: CAB_A,
    date: "2026-08-20",
    pickupTime: "08:00",
    packageHours: 4,
    status: "pending",
    ...overrides
  };
}

function driverBooking(overrides = {}) {
  return {
    _id: "d1",
    type: "driver",
    itemId: DRV_A,
    date: "2026-08-20",
    pickupTime: "08:00",
    packageHours: 4,
    status: "confirmed",
    ...overrides
  };
}

function reqFor(role, mobileNumber = "9000000001") {
  return { user: { role, mobileNumber } };
}

describe("Wave 2 booking availability", () => {
  it("parses existing date and pickupTime fields as IST, not UTC", () => {
    const window = bookingWindow({ date: "2026-08-20", pickupTime: "08:00", packageHours: 4 });
    assert.equal(window.start.toISOString(), "2026-08-20T02:30:00.000Z");
    assert.equal(window.end.toISOString(), "2026-08-20T06:30:00.000Z");
    assert.equal(window.source, "package");
  });

  it("uses packageId duration when packageHours is absent", () => {
    const four = bookingWindow({ date: "2026-08-20", pickupTime: "09:00", packageId: "local_4hr" });
    assert.equal(four.end - four.start, 4 * 60 * 60 * 1000);
    const eight = bookingWindow({ date: "2026-08-20", pickupTime: "09:00", packageId: "local_1day" });
    assert.equal(eight.end - eight.start, 8 * 60 * 60 * 1000);
  });

  it("occupies the remainder of the IST pickup day when duration cannot be derived", () => {
    const window = bookingWindow({
      date: "2026-08-20",
      pickupTime: "08:00",
      packageId: "outstation_oneway"
    });
    assert.equal(window.source, "date-remainder");
    assert.equal(window.end.toISOString(), "2026-08-20T18:30:00.000Z");
  });

  it("does not guess a window when date is missing or invalid", () => {
    assert.equal(bookingWindow({ pickupTime: "08:00", packageHours: 4 }), null);
    assert.equal(bookingWindow({ date: "20-08-2026", pickupTime: "08:00" }), null);
    assert.equal(bookingWindow({ date: "2026-13-40", pickupTime: "08:00" }), null);
    assert.equal(isValidDateString("2026-02-30"), false);
  });

  it("historical rows without pickupTime occupy from 00:00 IST (conservative, no rewrite)", () => {
    const window = bookingWindow({ date: "2026-08-20", packageHours: 4 });
    assert.equal(window.start.toISOString(), "2026-08-19T18:30:00.000Z");
  });

  it("TEST 1: same vehicle, same time → reject", () => {
    const existing = [cabBooking({ status: "confirmed" })];
    const request = cabBooking({ _id: "new", pickupTime: "08:00" });
    assert.equal(collectBlockingReservations(existing, request).length, 1);
  });

  it("TEST 2: same vehicle, overlapping time → reject", () => {
    const existing = [cabBooking({ pickupTime: "08:00", packageHours: 4, status: "pending" })];
    const request = cabBooking({ _id: "new", pickupTime: "10:00", packageHours: 4 });
    assert.equal(collectBlockingReservations(existing, request).length, 1);
  });

  it("TEST 3: same vehicle, non-overlapping time → allow", () => {
    const existing = [cabBooking({ pickupTime: "08:00", packageHours: 4, status: "confirmed" })];
    const request = cabBooking({ _id: "new", pickupTime: "13:00", packageHours: 4 });
    assert.equal(collectBlockingReservations(existing, request).length, 0);
    const a = bookingWindow(existing[0]);
    const b = bookingWindow(request);
    assert.equal(windowsOverlap(a, b), false);
  });

  it("touching endpoints do not overlap (08:00–12:00 then 12:00–16:00)", () => {
    const existing = [cabBooking({ pickupTime: "08:00", packageHours: 4 })];
    const request = cabBooking({ _id: "new", pickupTime: "12:00", packageHours: 4 });
    assert.equal(collectBlockingReservations(existing, request).length, 0);
  });

  it("TEST 4: different vehicles, same time → allow", () => {
    const existing = [cabBooking({ itemId: CAB_A, pickupTime: "08:00" })];
    const request = cabBooking({ _id: "new", itemId: CAB_B, pickupTime: "08:00" });
    assert.equal(collectBlockingReservations(existing, request).length, 0);
  });

  it("TEST 5: same driver, overlapping time → reject", () => {
    const existing = [driverBooking({ pickupTime: "08:00", packageHours: 4 })];
    const request = driverBooking({ _id: "new", pickupTime: "10:00", packageHours: 4, status: "pending" });
    assert.equal(collectBlockingReservations(existing, request).length, 1);
  });

  it("TEST 6: different drivers, same time → allow", () => {
    const existing = [driverBooking({ itemId: DRV_A })];
    const request = driverBooking({ _id: "new", itemId: DRV_B, pickupTime: "08:00" });
    assert.equal(collectBlockingReservations(existing, request).length, 0);
  });

  it("TEST 7: cancelled booking does not block", () => {
    const existing = [cabBooking({ status: "cancelled", pickupTime: "08:00" })];
    const request = cabBooking({ _id: "new", pickupTime: "08:00" });
    assert.equal(collectBlockingReservations(existing, request).length, 0);
    assert.equal(ACTIVE_RESERVATION_STATUSES.includes("cancelled"), false);
  });

  it("TEST 8: finished historical booking does not block", () => {
    const existing = [cabBooking({ status: "finished", pickupTime: "08:00" })];
    const request = cabBooking({ _id: "new", pickupTime: "08:00" });
    assert.equal(collectBlockingReservations(existing, request).length, 0);
    assert.equal(ACTIVE_RESERVATION_STATUSES.includes("finished"), false);
  });

  it("TEST 9: vendor A cannot use Vendor B vehicle", () => {
    const itemB = { _id: CAB_B, vendorAdminPhone: "9000000002" };
    assert.equal(catalogOwnedByVendor(itemB, reqFor("vendor_admin", "9000000001")), false);
    assert.throws(
      () => assertVendorOwnsBookableItem(reqFor("vendor_admin", "9000000001"), "cab", itemB),
      (err) => err instanceof HttpError && err.statusCode === 403 && /own vehicles/.test(err.message)
    );
  });

  it("TEST 10: vendor A cannot assign Vendor B driver", () => {
    const itemB = { _id: DRV_B, vendorAdminPhone: "9000000002" };
    assert.throws(
      () => assertVendorOwnsBookableItem(reqFor("vendor_admin", "9000000001"), "driver", itemB),
      (err) => err instanceof HttpError && err.statusCode === 403 && /own drivers/.test(err.message)
    );
  });

  it("TEST 11: super admin retains global assign access", () => {
    const itemB = { _id: CAB_B, vendorAdminPhone: "9000000002" };
    assert.doesNotThrow(() =>
      assertVendorOwnsBookableItem(reqFor("super_admin", "9990000000"), "cab", itemB)
    );
  });

  it("does not trust a vendorId on the request body for ownership", () => {
    const itemB = { _id: CAB_B, vendorAdminPhone: "9000000002" };
    const spoofed = {
      user: { role: "vendor_admin", mobileNumber: "9000000001" },
      body: { vendorId: "9000000002", vendorAdminPhone: "9000000002" }
    };
    assert.throws(
      () => assertVendorOwnsBookableItem(spoofed, "cab", itemB),
      (err) => err instanceof HttpError && err.statusCode === 403
    );
  });

  it("TEST 12: two simultaneous inserts for the same vehicle both see each other on recheck", () => {
    const a = cabBooking({ _id: "race-a", status: "pending" });
    const b = cabBooking({ _id: "race-b", status: "pending" });
    const window = bookingWindow(a);
    assert.ok(firstOverlapping([b], window));
    assert.ok(firstOverlapping([a], window));
    assert.equal(collectBlockingReservations([a, b], a, { excludeId: a._id }).length, 1);
    assert.equal(collectBlockingReservations([a, b], b, { excludeId: b._id }).length, 1);
  });

  it("TEST 13: tour and bus bookings are outside the cab/driver availability engine", () => {
    assert.equal(isAvailabilityType("tour"), false);
    assert.equal(isAvailabilityType("bus"), false);
    assert.doesNotThrow(() => validateCabDriverSchedule({ type: "tour", date: "", pickupTime: "" }));
    assert.doesNotThrow(() => validateCabDriverSchedule({ type: "bus", date: "", pickupTime: "" }));
    const existing = [cabBooking()];
    const tour = { type: "tour", itemId: CAB_A, date: "2026-08-20", pickupTime: "08:00", status: "pending" };
    assert.equal(collectBlockingReservations(existing, tour).length, 0);
  });

  it("rejects missing/invalid date and time on cab/driver creates", () => {
    assert.throws(
      () => validateCabDriverSchedule({ type: "cab", date: "", pickupTime: "09:00" }),
      (err) => err.statusCode === 400 && /date is required/.test(err.message)
    );
    assert.throws(
      () => validateCabDriverSchedule({ type: "cab", date: "2026-99-01", pickupTime: "09:00" }),
      (err) => err.statusCode === 400 && /Invalid pickup date/.test(err.message)
    );
    assert.throws(
      () => validateCabDriverSchedule({ type: "cab", date: "2026-08-20", pickupTime: "25:99" }),
      (err) => err.statusCode === 400 && /pickup time/.test(err.message)
    );
    assert.throws(
      () =>
        validateCabDriverSchedule({
          type: "cab",
          date: "2020-01-01",
          pickupTime: "09:00",
          packageHours: 4
        }),
      (err) => err.statusCode === 400 && /past/.test(err.message)
    );
    assert.doesNotThrow(() =>
      validateCabDriverSchedule(
        { type: "cab", date: "2020-01-01", pickupTime: "09:00", packageHours: 4 },
        { allowPast: true }
      )
    );
  });

  it("normalizes HH:mm pickup times and customer-facing conflict copy", () => {
    assert.equal(normalizeTime("8:00"), "08:00");
    assert.equal(normalizeTime("08:00:00"), "08:00");
    assert.equal(VEHICLE_UNAVAILABLE.includes("no longer available"), true);
    assert.equal(DRIVER_UNAVAILABLE.includes("no longer available"), true);
  });

  it("search busy-id filter hides booked vehicles without rewriting the catalog query", () => {
    const base = { status: "active" };
    const filtered = applyBusyIdFilter(base, [CAB_A]);
    assert.deepEqual(filtered, { $and: [{ status: "active" }, { _id: { $nin: [CAB_A] } }] });
    assert.deepEqual(applyBusyIdFilter(base, []), base);
  });

  it("customers are not blocked by vendor ownership checks", () => {
    const itemB = { _id: CAB_B, vendorAdminPhone: "9000000002" };
    assert.doesNotThrow(() => assertVendorOwnsBookableItem(reqFor("customer", "9111111111"), "cab", itemB));
  });

  it("vendor A can use their own vehicle", () => {
    const itemA = { _id: CAB_A, vendorAdminPhone: "9000000001" };
    assert.doesNotThrow(() =>
      assertVendorOwnsBookableItem(reqFor("vendor_admin", "9000000001"), "cab", itemA)
    );
  });
});

function customerTodayStr(now) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(now);
}

describe("Wave 2.1 pending expiry, occupancy, IST", () => {
  it("TEST 1: pending booking before expiry blocks vehicle", () => {
    const now = new Date("2026-08-20T03:00:00.000Z");
    const existing = [
      cabBooking({
        status: "pending",
        expiresAt: new Date("2026-08-20T07:00:00.000Z")
      })
    ];
    const request = cabBooking({ _id: "new", pickupTime: "08:00" });
    assert.equal(isReservationBlocking(existing[0], now), true);
    assert.equal(collectBlockingReservations(existing, request, { now }).length, 1);
  });

  it("TEST 2: pending booking after expiry does not block", () => {
    const now = new Date("2026-08-20T08:00:00.000Z");
    const existing = [
      cabBooking({
        status: "pending",
        expiresAt: new Date("2026-08-20T07:00:00.000Z")
      })
    ];
    const request = cabBooking({ _id: "new", pickupTime: "08:00" });
    assert.equal(isReservationBlocking(existing[0], now), false);
    assert.equal(collectBlockingReservations(existing, request, { now }).length, 0);
  });

  it("TEST 3: confirmed booking blocks", () => {
    const now = new Date("2026-08-21T00:00:00.000Z");
    const existing = [cabBooking({ status: "confirmed", expiresAt: null })];
    assert.equal(collectBlockingReservations(existing, cabBooking({ _id: "new" }), { now }).length, 1);
  });

  it("TEST 4: cancelled booking does not block", () => {
    const existing = [cabBooking({ status: "cancelled", expiresAt: new Date("2099-01-01") })];
    assert.equal(collectBlockingReservations(existing, cabBooking({ _id: "new" })).length, 0);
  });

  it("TEST 5: finished booking does not block", () => {
    const existing = [cabBooking({ status: "finished" })];
    assert.equal(collectBlockingReservations(existing, cabBooking({ _id: "new" })).length, 0);
  });

  it("TEST 6: same-day overlapping booking rejected", () => {
    const existing = [stampCabDriverSchedule(cabBooking({ pickupTime: "08:00", packageHours: 4, status: "confirmed" }))];
    const request = stampCabDriverSchedule(cabBooking({ _id: "new", pickupTime: "10:00", packageHours: 4 }));
    assert.equal(collectBlockingReservations(existing, request).length, 1);
  });

  it("TEST 7: overnight booking overlap rejected", () => {
    const existing = [
      stampCabDriverSchedule(
        cabBooking({
          date: "2026-08-20",
          pickupTime: "20:00",
          packageHours: "",
          packageId: "outstation_oneway",
          serviceTripType: "outstation",
          status: "confirmed"
        })
      )
    ];
    assert.equal(existing[0].endAt.toISOString(), "2026-08-21T02:30:00.000Z");
    const request = stampCabDriverSchedule(
      cabBooking({
        _id: "new",
        date: "2026-08-21",
        pickupTime: "06:00",
        packageHours: 4,
        status: "pending"
      })
    );
    assert.equal(collectBlockingReservations(existing, request).length, 1);
  });

  it("TEST 8: non-overlapping booking allowed", () => {
    const existing = [stampCabDriverSchedule(cabBooking({ pickupTime: "08:00", packageHours: 4, status: "confirmed" }))];
    const request = stampCabDriverSchedule(cabBooking({ _id: "new", pickupTime: "13:00", packageHours: 4 }));
    assert.equal(collectBlockingReservations(existing, request).length, 0);
  });

  it("TEST 9: server does not trust client durationMin", () => {
    const base = {
      date: "2026-08-20",
      pickupTime: "08:00",
      packageId: "outstation_oneway",
      serviceTripType: "outstation"
    };
    const short = deriveNewOccupancyMs({ ...base, durationMin: 1 });
    const long = deriveNewOccupancyMs({ ...base, durationMin: 9999 });
    const none = deriveNewOccupancyMs(base);
    assert.equal(short, none);
    assert.equal(long, none);
    assert.equal(none, 12 * 60 * 60 * 1000);
    const withKm = deriveNewOccupancyMs({ ...base, durationMin: 1, distanceKm: 80 }, { allowDistance: true });
    const withKmAndFakeDuration = deriveNewOccupancyMs(
      { ...base, durationMin: 9999, distanceKm: 80 },
      { allowDistance: true }
    );
    assert.equal(withKm, withKmAndFakeDuration);
    assert.notEqual(withKm, none);
  });

  it("TEST 10: customer date and backend date match in IST", () => {
    const samples = [
      new Date("2026-08-19T18:00:00.000Z"),
      new Date("2026-08-19T18:30:00.000Z"),
      new Date("2026-08-19T19:00:00.000Z"),
      new Date("2026-08-20T18:29:00.000Z")
    ];
    for (const now of samples) {
      assert.equal(customerTodayStr(now), istYmd(now));
    }
  });

  it("TEST 11: midnight IST boundary", () => {
    const beforeMidnight = new Date("2026-08-19T18:00:00.000Z");
    const atMidnight = new Date("2026-08-19T18:30:00.000Z");
    const afterMidnight = new Date("2026-08-19T19:00:00.000Z");
    assert.equal(istYmd(beforeMidnight), "2026-08-19");
    assert.equal(istYmd(atMidnight), "2026-08-20");
    assert.equal(istYmd(afterMidnight), "2026-08-20");
    assert.equal(beforeMidnight.toISOString().slice(0, 10), "2026-08-19");
    assert.equal(afterMidnight.toISOString().slice(0, 10), "2026-08-19");
    assert.notEqual(istYmd(afterMidnight), afterMidnight.toISOString().slice(0, 10));
  });

  it("TEST 12: existing customer booking flow still works (tour/bus skip hold stamps)", () => {
    const tour = { type: "tour", date: "", pickupTime: "", status: "pending" };
    assert.equal(stampCabDriverSchedule(tour), tour);
    assert.equal(tour.startAt, undefined);
    assert.equal(tour.expiresAt, undefined);
    assert.doesNotThrow(() => validateCabDriverSchedule({ type: "bus", date: "" }));
  });

  it("historical pending without expiresAt still blocks (no backfill)", () => {
    const existing = [cabBooking({ status: "pending" })];
    assert.equal(existing[0].expiresAt, undefined);
    assert.equal(collectBlockingReservations(existing, cabBooking({ _id: "new" })).length, 1);
  });

  it("cash pending hold is 4 hours, capped at occupancy start", () => {
    const now = new Date("2026-08-20T00:00:00.000Z");
    const laterStart = new Date("2026-08-20T10:00:00.000Z");
    const soonStart = new Date("2026-08-20T01:00:00.000Z");
    assert.equal(computePendingExpiresAt(now, laterStart, "cash").getTime(), now.getTime() + PENDING_HOLD_MS_CASH);
    assert.equal(computePendingExpiresAt(now, soonStart, "cash").getTime(), soonStart.getTime());
  });

  it("new outstation occupancy is 12h one-way / 24h round-trip, not rest-of-day", () => {
    const one = deriveNewOccupancyWindow({
      date: "2026-08-20",
      pickupTime: "20:00",
      packageId: "outstation_oneway",
      serviceTripType: "outstation"
    });
    assert.equal(one.source, "outstation");
    assert.equal(one.end - one.start, 12 * 60 * 60 * 1000);
    const round = deriveNewOccupancyWindow({
      date: "2026-08-20",
      pickupTime: "08:00",
      packageId: "outstation_twoway",
      serviceTripType: "outstation",
      roundTrip: true
    });
    assert.equal(round.end - round.start, 24 * 60 * 60 * 1000);
  });

  it("search occupancy ignores client distanceKm", () => {
    const requested = require("./bookingAvailability").requestedWindowFromInput({
      date: "2026-08-20",
      time: "08:00",
      packageId: "outstation_oneway",
      serviceTripType: "outstation",
      distanceKm: 1
    });
    assert.equal(requested.end - requested.start, 12 * 60 * 60 * 1000);
  });
});
