"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { HttpError } = require("./httpError");
const {
  LOCATION_LIVE_MS,
  LOCATION_RECENT_MS,
  vendorCanReadTracking
} = require("./driverGps");
const { assertDriverCanPingLocation } = require("./driverGps");
const { sanitizeBookingForViewer, enrichBookingForDisplay } = require("./bookingContact");
const {
  TRACKING_STATES,
  trackingDisplayState,
  shouldPollTracking,
  assertCanReadBookingLocation,
  customerLocationPayload
} = require("./customerTracking");

const USER_A = "64a00000000000000000000a";
const USER_B = "64b00000000000000000000b";
const DRV_A = "64c00000000000000000000c";
const NOW = new Date("2026-08-20T05:00:00.000Z");

function cabBooking(overrides = {}) {
  return {
    _id: "64e00000000000000000000e",
    type: "cab",
    status: "confirmed",
    user: USER_A,
    phone: "9888888888",
    vendorAdminPhone: "9000000001",
    assignedDriverId: DRV_A,
    assignedVehicleId: "64f00000000000000000000f",
    tripStartedAt: new Date("2026-08-20T04:40:00.000Z"),
    tripFinishedAt: null,
    pickup: "Chennai Airport",
    drop: "Coimbatore",
    pickupLat: 12.99,
    pickupLng: 80.17,
    dropLat: 11.02,
    dropLng: 76.96,
    latestLocation: {
      latitude: 13.08,
      longitude: 80.27,
      updatedAt: NOW
    },
    amount: 4500,
    commission: 400,
    ...overrides
  };
}

function customerReq(userId = USER_A, phone = "9888888888") {
  return { user: { _id: userId, mobileNumber: phone, role: "customer" } };
}

function vendorReq(phone = "9000000001") {
  return { user: { role: "vendor_admin", mobileNumber: phone } };
}

describe("Wave 4D customer tracking / location privacy", () => {
  it("TEST 1: Customer A can read own booking location", () => {
    const booking = cabBooking();
    assert.doesNotThrow(() => assertCanReadBookingLocation(booking, customerReq()));
    const payload = customerLocationPayload(booking, { driverName: "Ravi", vehicleTitle: "Dzire" }, NOW);
    assert.equal(payload.trackingState, TRACKING_STATES.LIVE);
    assert.equal(payload.latestLocation.latitude, 13.08);
    assert.equal(payload.latestLocation.longitude, 80.27);
    assert.equal(payload.driverName, "Ravi");
    assert.equal(payload.vehicleTitle, "Dzire");
    assert.equal(payload.vendorAdminPhone, undefined);
    assert.equal(payload.amount, undefined);
    assert.equal(payload.commission, undefined);
  });

  it("TEST 2: Customer A cannot read Customer B location", () => {
    const booking = cabBooking({ user: USER_B, phone: "9777777777" });
    assert.throws(
      () => assertCanReadBookingLocation(booking, customerReq()),
      (err) => err instanceof HttpError && err.statusCode === 404
    );
  });

  it("TEST 3: Unauthenticated customer cannot read location", () => {
    assert.throws(
      () => assertCanReadBookingLocation(cabBooking(), {}),
      (err) => err.statusCode === 401
    );
    assert.throws(
      () => assertCanReadBookingLocation(cabBooking(), { user: null }),
      (err) => err.statusCode === 401
    );
  });

  it("TEST 4: Vendor A cannot read Vendor B location", () => {
    const booking = cabBooking({ vendorAdminPhone: "9000000002" });
    assert.equal(vendorCanReadTracking(booking, vendorReq("9000000001")), false);
    assert.throws(
      () => assertCanReadBookingLocation(booking, vendorReq("9000000001")),
      (err) => err.statusCode === 404
    );
    assert.doesNotThrow(() => assertCanReadBookingLocation(booking, vendorReq("9000000002")));
  });

  it("TEST 5: Super admin can read location", () => {
    const booking = cabBooking();
    assert.doesNotThrow(() =>
      assertCanReadBookingLocation(booking, { user: { role: "super_admin", mobileNumber: "9000000000" } })
    );
    const payload = customerLocationPayload(booking, {}, NOW);
    assert.equal(payload.trackingState, TRACKING_STATES.LIVE);
    assert.ok(payload.latestLocation);
  });

  it("TEST 6: Driver cannot use customer location endpoint unless explicitly allowed", () => {
    const booking = cabBooking();
    assert.throws(
      () =>
        assertCanReadBookingLocation(booking, {
          user: { role: "driver", driverId: DRV_A, _id: USER_A }
        }),
      (err) => err.statusCode === 403
    );
  });

  it("TEST 7: Finished booking does not continue GPS writes", () => {
    const booking = cabBooking({
      status: "finished",
      tripFinishedAt: NOW
    });
    assert.throws(
      () => assertDriverCanPingLocation(booking, DRV_A),
      (err) => err.statusCode === 400
    );
    assert.equal(shouldPollTracking(booking, NOW), false);
  });

  it("TEST 8: Cancelled booking cannot receive GPS", () => {
    const booking = cabBooking({ status: "cancelled" });
    assert.throws(
      () => assertDriverCanPingLocation(booking, DRV_A),
      (err) => err.statusCode === 400
    );
    const payload = customerLocationPayload(booking, {}, NOW);
    assert.equal(payload.latestLocation, null);
    assert.equal(payload.poll, false);
  });

  it("TEST 9: Customer generic booking response does not contain latestLocation", () => {
    const booking = cabBooking();
    const customerView = sanitizeBookingForViewer(booking, { isAdmin: false });
    assert.equal(customerView.latestLocation, undefined);
    assert.equal(customerView.tracking, undefined);
  });

  it("TEST 10: Vendor generic booking response does not leak unauthorized location", () => {
    const bookingB = cabBooking({ vendorAdminPhone: "9000000002" });
    assert.equal(vendorCanReadTracking(bookingB, vendorReq("9000000001")), false);
    const asCustomer = sanitizeBookingForViewer(bookingB, { isAdmin: false });
    assert.equal(asCustomer.latestLocation, undefined);
    assert.throws(
      () => assertCanReadBookingLocation(bookingB, vendorReq("9000000001")),
      (err) => err.statusCode === 404
    );
  });

  it("TEST 11: Stale location is correctly classified", () => {
    const staleAt = new Date(NOW.getTime() - LOCATION_RECENT_MS - 1000);
    const booking = cabBooking({
      latestLocation: { latitude: 13.08, longitude: 80.27, updatedAt: staleAt }
    });
    assert.equal(trackingDisplayState(booking, NOW), TRACKING_STATES.STALE);
    const payload = customerLocationPayload(booking, {}, NOW);
    assert.equal(payload.trackingState, TRACKING_STATES.STALE);
    assert.equal(payload.freshness, "stale");
    assert.ok(payload.latestLocation);
    assert.notEqual(payload.trackingState, TRACKING_STATES.LIVE);
  });

  it("TEST 12: Finished trip is never reported as LIVE", () => {
    const booking = cabBooking({
      status: "finished",
      tripFinishedAt: NOW,
      latestLocation: {
        latitude: 13.08,
        longitude: 80.27,
        updatedAt: NOW
      }
    });
    assert.equal(trackingDisplayState(booking, NOW), TRACKING_STATES.FINISHED);
    const payload = customerLocationPayload(booking, {}, NOW);
    assert.equal(payload.trackingState, TRACKING_STATES.FINISHED);
    assert.equal(payload.freshness, TRACKING_STATES.FINISHED);
    assert.notEqual(payload.trackingState, TRACKING_STATES.LIVE);
    assert.notEqual(payload.freshness, "live");
    assert.equal(payload.poll, false);
    assert.equal(payload.latestLocation.latitude, 13.08);
  });

  it("does not expose GPS before the trip starts", () => {
    const booking = cabBooking({
      tripStartedAt: null,
      latestLocation: { latitude: 13.08, longitude: 80.27, updatedAt: NOW }
    });
    const payload = customerLocationPayload(booking, {}, NOW);
    assert.equal(payload.trackingState, TRACKING_STATES.NOT_STARTED);
    assert.equal(payload.latestLocation, null);
    assert.equal(payload.poll, true);
  });

  it("never labels a recent ping LIVE after finish in admin tracking", async () => {
    const booking = cabBooking({
      status: "finished",
      tripFinishedAt: NOW,
      latestLocation: { latitude: 13.08, longitude: 80.27, updatedAt: NOW }
    });
    const adminView = await enrichBookingForDisplay(booking, { isAdmin: true });
    assert.equal(adminView.tracking.freshness, TRACKING_STATES.FINISHED);
    assert.notEqual(adminView.tracking.freshness, "live");
  });

  it("classifies live and recent from server updatedAt", () => {
    const live = cabBooking({
      latestLocation: { latitude: 13, longitude: 80, updatedAt: new Date(NOW.getTime() - LOCATION_LIVE_MS + 1000) }
    });
    const recent = cabBooking({
      latestLocation: {
        latitude: 13,
        longitude: 80,
        updatedAt: new Date(NOW.getTime() - LOCATION_LIVE_MS - 1000)
      }
    });
    assert.equal(trackingDisplayState(live, NOW), TRACKING_STATES.LIVE);
    assert.equal(trackingDisplayState(recent, NOW), TRACKING_STATES.RECENT);
  });
});
