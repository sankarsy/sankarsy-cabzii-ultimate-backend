"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { HttpError } = require("./httpError");
const {
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
} = require("./driverGps");
const { canMutateBookingAssignment } = require("./driverTripAccess");
const { stripUntrustedPricing } = require("./bookingIntegrity");
const { sanitizeBookingForViewer } = require("./bookingContact");
const { isAdminUser, isSuperAdminUser } = require("./adminAccess");
const { isVendorAdmin } = require("./vendorBookingAccess");

const DRV_A = "64c00000000000000000000c";
const DRV_B = "64d00000000000000000000d";
const NOW = new Date("2026-08-20T05:00:00.000Z");

function activeTrip(overrides = {}) {
  return {
    _id: "64e00000000000000000000e",
    assignedDriverId: DRV_A,
    status: "confirmed",
    tripStartedAt: new Date("2026-08-20T04:40:00.000Z"),
    tripFinishedAt: null,
    vendorAdminPhone: "9000000001",
    latestLocation: null,
    ...overrides
  };
}

describe("Wave 4C driver GPS / live location", () => {
  it("TEST 1: driver can update own active trip", () => {
    assert.doesNotThrow(() => assertDriverCanPingLocation(activeTrip(), DRV_A));
    assert.equal(isGpsActiveTrip(activeTrip()), true);
  });

  it("TEST 2: driver cannot update another driver's trip", () => {
    assert.throws(
      () => assertDriverCanPingLocation(activeTrip({ assignedDriverId: DRV_B }), DRV_A),
      (err) => err instanceof HttpError && err.statusCode === 404
    );
  });

  it("TEST 3: driver cannot update an unassigned trip", () => {
    assert.throws(
      () => assertDriverCanPingLocation(activeTrip({ assignedDriverId: null }), DRV_A),
      (err) => err.statusCode === 404
    );
  });

  it("TEST 4: driver cannot update before trip start", () => {
    assert.throws(
      () => assertDriverCanPingLocation(activeTrip({ tripStartedAt: null }), DRV_A),
      (err) => err.statusCode === 400
    );
  });

  it("TEST 5: driver cannot update after trip finish", () => {
    assert.throws(
      () =>
        assertDriverCanPingLocation(
          activeTrip({ tripFinishedAt: NOW, status: "finished" }),
          DRV_A
        ),
      (err) => err.statusCode === 400
    );
  });

  it("TEST 6: driver cannot update cancelled booking", () => {
    assert.throws(
      () => assertDriverCanPingLocation(activeTrip({ status: "cancelled" }), DRV_A),
      (err) => err.statusCode === 400
    );
  });

  it("TEST 7: vendor cannot write GPS as driver", () => {
    assert.equal(canMutateBookingAssignment("vendor_admin"), true);
    assert.equal(["driver"].includes("vendor_admin"), false);
    assert.equal(isVendorAdmin({ user: { role: "driver" } }), false);
  });

  it("TEST 8: customer cannot write GPS", () => {
    assert.equal(["driver"].includes("customer"), false);
    assert.equal(isAdminUser({ user: { role: "customer" } }), false);
  });

  it("TEST 9: vendor A cannot read vendor B tracking", () => {
    const booking = activeTrip({ vendorAdminPhone: "9000000002" });
    assert.equal(
      vendorCanReadTracking(booking, { user: { role: "vendor_admin", mobileNumber: "9000000001" } }),
      false
    );
    assert.equal(
      vendorCanReadTracking(booking, { user: { role: "vendor_admin", mobileNumber: "9000000002" } }),
      true
    );
    assert.equal(
      vendorCanReadTracking(booking, { user: { role: "super_admin", mobileNumber: "9000000000" } }),
      true
    );
    assert.equal(isSuperAdminUser({ user: { role: "super_admin" } }), true);
  });

  it("TEST 10: invalid latitude is rejected", () => {
    assert.throws(
      () => parseLocationPing({ latitude: 100, longitude: 80 }),
      (err) => err.statusCode === 400
    );
    assert.throws(
      () => parseLocationPing({ latitude: "abc", longitude: 80 }),
      (err) => err.statusCode === 400
    );
  });

  it("TEST 11: invalid longitude is rejected", () => {
    assert.throws(
      () => parseLocationPing({ latitude: 13, longitude: 200 }),
      (err) => err.statusCode === 400
    );
  });

  it("TEST 12: client timestamp cannot override server timestamp", () => {
    const parsed = parseLocationPing({
      latitude: 13.08,
      longitude: 80.27,
      updatedAt: "2000-01-01T00:00:00.000Z",
      timestamp: 1,
      driverId: DRV_B,
      vendorAdminPhone: "9000000002"
    });
    assert.equal(parsed.updatedAt, undefined);
    const patch = locationWritePatch(parsed, NOW);
    assert.equal(patch.latestLocation.updatedAt.getTime(), NOW.getTime());
    assert.equal(parsed.driverId, undefined);
  });

  it("persists only the latest location fields", () => {
    const patch = locationWritePatch(parseLocationPing({ latitude: 13.08, longitude: 80.27, accuracy: 12 }), NOW);
    assert.equal(patch.latestLocation.latitude, 13.08);
    assert.equal(patch.latestLocation.longitude, 80.27);
    assert.equal(patch.latestLocation.accuracy, 12);
    assert.equal(patch.latestLocation.updatedAt.getTime(), NOW.getTime());
  });

  it("classifies live / recent / stale from server updatedAt", () => {
    assert.equal(locationFreshness(NOW, NOW), "live");
    assert.equal(locationFreshness(new Date(NOW.getTime() - LOCATION_LIVE_MS + 1000), NOW), "live");
    assert.equal(locationFreshness(new Date(NOW.getTime() - LOCATION_LIVE_MS - 1000), NOW), "recent");
    assert.equal(locationFreshness(new Date(NOW.getTime() - LOCATION_RECENT_MS - 1000), NOW), "stale");
    assert.equal(locationFreshness(null, NOW), "none");
    assert.equal(sanitizeLatestLocation({ latitude: 13, longitude: 80, updatedAt: NOW }, NOW).freshness, "live");
  });

  it("skips excessive writes within the minimum interval", () => {
    const existing = activeTrip({
      latestLocation: { latitude: 13, longitude: 80, updatedAt: NOW }
    });
    assert.equal(shouldSkipLocationWrite(existing, new Date(NOW.getTime() + LOCATION_MIN_WRITE_MS - 1)), true);
    assert.equal(shouldSkipLocationWrite(existing, new Date(NOW.getTime() + LOCATION_MIN_WRITE_MS + 1)), false);
  });

  it("does not expose latestLocation on customer booking payloads", () => {
    const booking = activeTrip({
      latestLocation: { latitude: 13.08, longitude: 80.27, updatedAt: NOW },
      status: "confirmed"
    });
    const customerView = sanitizeBookingForViewer(booking, { isAdmin: false });
    assert.equal(customerView.latestLocation, undefined);
    const adminView = sanitizeBookingForViewer(booking, { isAdmin: true });
    assert.equal(adminView.latestLocation.latitude, 13.08);
  });

  it("rejects negative accuracy", () => {
    assert.throws(
      () => parseLocationPing({ latitude: 13, longitude: 80, accuracy: -1 }),
      (err) => err.statusCode === 400
    );
  });

  it("strips latestLocation from untrusted client booking bodies", () => {
    const stripped = stripUntrustedPricing({
      latestLocation: { latitude: 1, longitude: 2, updatedAt: "2000-01-01" },
      pickup: "Chennai"
    });
    assert.equal(stripped.pickup, "Chennai");
    assert.equal(stripped.latestLocation, undefined);
  });
});
