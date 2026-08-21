"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { HttpError } = require("./httpError");
const {
  assertDriverCanStartTrip,
  assertDriverCanFinishTrip,
  vendorFinishPatch,
  DRIVER_START_EARLY_MS
} = require("./driverTripOps");
const {
  driverTripQuery,
  driverTripListFilter,
  bookingAssignedToDriver,
  sanitizeDriverTrip,
  classifyDriverTrips,
  canMutateBookingAssignment
} = require("./driverTripAccess");
const { assertReassignmentAllowed } = require("./bookingAssignment");
const { stripUntrustedPricing } = require("./bookingIntegrity");
const { catalogUsable } = require("./bookingAssignment");
const { catalogOwnedByVendor } = require("./bookingAvailability");
const { vendorOrScope, docMatchForVendor } = require("./vendorAccess");
const { isAdminUser, isSuperAdminUser, resolveEffectiveRole } = require("./adminAccess");
const { isVendorAdmin } = require("./vendorBookingAccess");
const { assertDriverCanLogin, driverSessionUser } = require("./driverIdentity");

const DRV_A = "64c00000000000000000000c";
const DRV_B = "64d00000000000000000000d";
const NOW = new Date("2026-08-20T05:00:00.000Z");

function confirmedTrip(overrides = {}) {
  return {
    _id: "64e00000000000000000000e",
    assignedDriverId: DRV_A,
    status: "confirmed",
    date: "2026-08-20",
    pickupTime: "10:00",
    pickup: "Chennai",
    drop: "Airport",
    customerName: "Anita",
    phone: "9888888888",
    startAt: new Date("2026-08-20T04:30:00.000Z"),
    endAt: new Date("2026-08-20T08:30:00.000Z"),
    tripStartedAt: null,
    tripFinishedAt: null,
    amount: 2400,
    vendorAdminPhone: "9000000001",
    ...overrides
  };
}

describe("Wave 4B driver trip actions and PWA security", () => {
  it("driver login session stays driver, never vendor_admin", () => {
    const session = driverSessionUser(
      { _id: "u1", mobileNumber: "9111111111", role: "customer" },
      { _id: DRV_A, phone: "9111111111", name: "Ravi" }
    );
    assert.equal(session.role, "driver");
    assert.equal(resolveEffectiveRole("9111111111", "driver", "vendor_admin"), "driver");
    assert.equal(isAdminUser({ user: { role: "driver" } }), false);
    assert.equal(isVendorAdmin({ user: { role: "driver" } }), false);
  });

  it("TEST 1: driver A trip query only matches driver A", () => {
    assert.deepEqual(driverTripQuery(DRV_A), { assignedDriverId: DRV_A });
    assert.equal(bookingAssignedToDriver(confirmedTrip(), DRV_A), true);
  });

  it("TEST 2: driver A cannot see or start driver B trip", () => {
    const other = confirmedTrip({ assignedDriverId: DRV_B });
    assert.equal(bookingAssignedToDriver(other, DRV_A), false);
    assert.throws(
      () => assertDriverCanStartTrip(other, DRV_A, NOW),
      (err) => err instanceof HttpError && err.statusCode === 404
    );
    assert.throws(
      () => assertDriverCanFinishTrip(other, DRV_A),
      (err) => err instanceof HttpError && err.statusCode === 404
    );
  });

  it("TEST 3/4: driver cannot access vendor or super admin roles", () => {
    assert.equal(canMutateBookingAssignment("driver"), false);
    assert.equal(isAdminUser({ user: { role: "driver", mobileNumber: "9111111111" } }), false);
    assert.equal(isSuperAdminUser({ user: { role: "driver" } }), false);
  });

  it("TEST 5/6: driver cannot modify vehicle or driver assignment", () => {
    assert.equal(canMutateBookingAssignment("driver"), false);
    assert.equal(canMutateBookingAssignment("vendor_admin"), true);
  });

  it("TEST 7/8: driver trip payload has no fare, vendor, or assignment write fields", () => {
    const trip = sanitizeDriverTrip(confirmedTrip({ couponCode: "SAVE", vendor: "Secret" }));
    assert.equal(trip.amount, undefined);
    assert.equal(trip.vendor, undefined);
    assert.equal(trip.vendorAdminPhone, undefined);
    assert.equal(trip.couponCode, undefined);
    const stripped = stripUntrustedPricing({
      tripStartedAt: NOW,
      tripFinishedAt: NOW,
      assignedVehicleId: "x",
      assignedDriverId: "y",
      amount: 1
    });
    assert.equal(stripped.tripStartedAt, undefined);
    assert.equal(stripped.assignedDriverId, undefined);
    assert.equal(stripped.amount, undefined);
  });

  it("TEST 9: driver cannot start another driver's trip", () => {
    assert.throws(
      () => assertDriverCanStartTrip(confirmedTrip({ assignedDriverId: DRV_B }), DRV_A, NOW),
      (err) => err.statusCode === 404
    );
  });

  it("TEST 10: driver cannot finish another driver's trip", () => {
    assert.throws(
      () =>
        assertDriverCanFinishTrip(
          confirmedTrip({ assignedDriverId: DRV_B, tripStartedAt: NOW }),
          DRV_A
        ),
      (err) => err.statusCode === 404
    );
  });

  it("TEST 11: inactive driver cannot log in", () => {
    assert.throws(
      () => assertDriverCanLogin({ status: "inactive", phone: "9111111111" }),
      (err) => err.statusCode === 403
    );
  });

  it("TEST 12: vendor A cannot manage vendor B driver", () => {
    const req = { user: { role: "vendor_admin", mobileNumber: "9000000001" } };
    assert.equal(catalogOwnedByVendor({ vendorAdminPhone: "9000000002" }, req), false);
    assert.equal(docMatchForVendor(req, DRV_B).vendorAdminPhone, "9000000001");
  });

  it("TEST 13: super admin retains global access", () => {
    const req = { user: { role: "super_admin", mobileNumber: "9000000000" } };
    assert.equal(isSuperAdminUser(req), true);
    assert.equal(vendorOrScope(req), null);
    assert.equal(canMutateBookingAssignment("super_admin"), true);
    assert.doesNotThrow(() =>
      assertReassignmentAllowed(confirmedTrip({ tripStartedAt: NOW }), { allowPast: true, now: NOW })
    );
  });

  it("starts a confirmed assigned trip inside the operational window", () => {
    assert.doesNotThrow(() => assertDriverCanStartTrip(confirmedTrip(), DRV_A, NOW));
  });

  it("rejects duplicate start", () => {
    assert.throws(
      () => assertDriverCanStartTrip(confirmedTrip({ tripStartedAt: NOW }), DRV_A, NOW),
      (err) => err.statusCode === 409
    );
  });

  it("rejects unconfirmed and cancelled starts", () => {
    assert.throws(
      () => assertDriverCanStartTrip(confirmedTrip({ status: "pending" }), DRV_A, NOW),
      (err) => err.statusCode === 400
    );
    assert.throws(
      () => assertDriverCanStartTrip(confirmedTrip({ status: "cancelled" }), DRV_A, NOW),
      (err) => err.statusCode === 400
    );
  });

  it("rejects start outside the operational window", () => {
    const tooEarly = new Date(confirmedTrip().startAt.getTime() - DRIVER_START_EARLY_MS - 60 * 1000);
    assert.throws(
      () => assertDriverCanStartTrip(confirmedTrip(), DRV_A, tooEarly),
      (err) => err.statusCode === 400
    );
    const tooLate = new Date(confirmedTrip().endAt.getTime() + DRIVER_START_EARLY_MS + 60 * 1000);
    assert.throws(
      () => assertDriverCanStartTrip(confirmedTrip(), DRV_A, tooLate),
      (err) => err.statusCode === 400
    );
  });

  it("finish requires the same driver to have started the trip", () => {
    assert.throws(
      () => assertDriverCanFinishTrip(confirmedTrip(), DRV_A),
      (err) => err.statusCode === 400
    );
    assert.doesNotThrow(() =>
      assertDriverCanFinishTrip(confirmedTrip({ tripStartedAt: NOW }), DRV_A)
    );
  });

  it("rejects duplicate finish", () => {
    assert.throws(
      () =>
        assertDriverCanFinishTrip(
          confirmedTrip({ tripStartedAt: NOW, tripFinishedAt: NOW, status: "finished" }),
          DRV_A
        ),
      (err) => err.statusCode === 409
    );
  });

  it("vendor/admin finish stamps tripFinishedAt without inventing a new status", () => {
    const patch = vendorFinishPatch(confirmedTrip({ tripStartedAt: NOW }), NOW);
    assert.equal(patch.status, "finished");
    assert.equal(patch.tripFinishedAt.getTime(), NOW.getTime());
    assert.equal(patch.finishedAt.getTime(), NOW.getTime());
  });

  it("blocks vendor reassignment after the driver started", () => {
    assert.throws(
      () => assertReassignmentAllowed(confirmedTrip({ tripStartedAt: NOW }), { now: NOW }),
      (err) => err.statusCode === 400
    );
  });

  it("inactive catalog driver is not assignable", () => {
    assert.equal(catalogUsable({ status: "inactive" }), false);
  });

  it("today/upcoming/current classification and list filter stay assigned-driver scoped", () => {
    const classified = classifyDriverTrips(
      [
        sanitizeDriverTrip(confirmedTrip({ date: "2026-08-20", tripStartedAt: NOW })),
        sanitizeDriverTrip(confirmedTrip({ _id: "u1", date: "2026-08-21" }))
      ],
      "2026-08-20"
    );
    assert.equal(classified.today.length, 1);
    assert.equal(classified.upcoming.length, 1);
    assert.equal(classified.current.length, 1);
    const filter = driverTripListFilter(DRV_A, "2026-08-20");
    assert.equal(filter.assignedDriverId, DRV_A);
    assert.equal(JSON.stringify(filter).includes("vendorAdminPhone"), false);
  });

  it("does not trust client trip timestamps", () => {
    const stripped = stripUntrustedPricing({
      tripStartedAt: "client-time",
      tripFinishedAt: "client-time",
      pickup: "Chennai"
    });
    assert.equal(stripped.pickup, "Chennai");
    assert.equal(stripped.tripStartedAt, undefined);
    assert.equal(stripped.tripFinishedAt, undefined);
  });
});
