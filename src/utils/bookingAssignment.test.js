"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  collectBlockingForVehicle,
  collectBlockingForDriver,
  effectiveVehicleId,
  effectiveDriverId,
  stampCreateAssignments,
  assertPendingHoldValid,
  HOLD_EXPIRED,
  VEHICLE_UNAVAILABLE,
  DRIVER_UNAVAILABLE
} = require("./bookingAvailability");
const { catalogOwnedByVendor, assertVendorOwnsBookableItem } = require("./bookingAvailability");
const { assertReassignmentAllowed } = require("./bookingAssignment");
const { HttpError } = require("./httpError");

const CAB_A = "64a00000000000000000000a";
const CAB_B = "64b00000000000000000000b";
const DRV_A = "64c00000000000000000000c";
const DRV_B = "64d00000000000000000000d";

function cabRow(overrides = {}) {
  return {
    _id: "b1",
    type: "cab",
    itemId: CAB_A,
    assignedVehicleId: CAB_A,
    date: "2026-08-20",
    pickupTime: "10:00",
    packageHours: 4,
    status: "confirmed",
    ...overrides
  };
}

describe("Wave 3 operator assignment", () => {
  it("TEST 1/14: vendor ownership is authenticated phone, not body vendorId", () => {
    const itemB = { _id: CAB_B, vendorAdminPhone: "9000000002" };
    const spoofed = {
      user: { role: "vendor_admin", mobileNumber: "9000000001" },
      body: { vendorId: "9000000002", vendorAdminPhone: "9000000002", assignedVehicleId: CAB_B }
    };
    assert.equal(catalogOwnedByVendor(itemB, spoofed), false);
    assert.throws(
      () => assertVendorOwnsBookableItem(spoofed, "cab", itemB),
      (err) => err instanceof HttpError && err.statusCode === 403
    );
  });

  it("TEST 4: vendor assigning own vehicle occupies that vehicle id", () => {
    assert.equal(effectiveVehicleId(cabRow()), CAB_A);
    const existing = [cabRow()];
    const request = cabRow({ _id: "b2", itemId: CAB_A, assignedVehicleId: CAB_A, pickupTime: "12:00" });
    assert.equal(collectBlockingForVehicle(existing, CAB_A, request).length, 1);
  });

  it("TEST 5: vendor cannot occupy another vendor vehicle via assignment overlap identity", () => {
    const existing = [cabRow({ assignedVehicleId: CAB_B, itemId: CAB_A })];
    const request = cabRow({ _id: "b2", itemId: CAB_B, assignedVehicleId: CAB_B, pickupTime: "12:00" });
    assert.equal(collectBlockingForVehicle(existing, CAB_B, request).length, 1);
    assert.equal(collectBlockingForVehicle(existing, CAB_A, request).length, 0);
  });

  it("TEST 6: cab booking with assigned driver occupies that driver", () => {
    const existing = [cabRow({ assignedDriverId: DRV_A })];
    const request = cabRow({ _id: "b2", assignedDriverId: DRV_A, pickupTime: "12:00" });
    assert.equal(effectiveDriverId(existing[0]), DRV_A);
    assert.equal(collectBlockingForDriver(existing, DRV_A, request).length, 1);
  });

  it("TEST 7: a different driver at the same time does not block", () => {
    const existing = [cabRow({ assignedDriverId: DRV_A })];
    const request = cabRow({ _id: "b2", assignedDriverId: DRV_B, pickupTime: "10:00" });
    assert.equal(collectBlockingForDriver(existing, DRV_B, request).length, 0);
  });

  it("TEST 8: driver overlap prevents assignment", () => {
    const existing = [
      {
        _id: "d1",
        type: "driver",
        itemId: DRV_A,
        assignedDriverId: DRV_A,
        date: "2026-08-20",
        pickupTime: "10:00",
        packageHours: 4,
        status: "confirmed"
      }
    ];
    const request = cabRow({ _id: "b2", assignedDriverId: DRV_A, pickupTime: "12:00" });
    assert.equal(collectBlockingForDriver(existing, DRV_A, request).length, 1);
  });

  it("TEST 9: vehicle overlap prevents assignment", () => {
    const existing = [cabRow({ pickupTime: "10:00", packageHours: 4 })];
    const request = cabRow({ _id: "b2", pickupTime: "12:00", packageHours: 4 });
    assert.equal(collectBlockingForVehicle(existing, CAB_A, request).length, 1);
  });

  it("TEST 10: valid reassignment to a free vehicle is allowed", () => {
    const existing = [cabRow({ assignedVehicleId: CAB_A })];
    const request = cabRow({
      _id: "b2",
      itemId: CAB_A,
      assignedVehicleId: CAB_B,
      pickupTime: "12:00"
    });
    assert.equal(collectBlockingForVehicle(existing, CAB_B, request).length, 0);
  });

  it("TEST 11: invalid reassignment onto an occupied vehicle fails", () => {
    const existing = [
      cabRow({ _id: "b1", assignedVehicleId: CAB_B, itemId: CAB_A, pickupTime: "10:00" })
    ];
    const request = cabRow({ _id: "b2", itemId: CAB_A, assignedVehicleId: CAB_B, pickupTime: "12:00" });
    assert.equal(collectBlockingForVehicle(existing, CAB_B, request).length, 1);
  });

  it("TEST 12: cancelled booking does not block vehicle or driver", () => {
    const existing = [
      cabRow({ status: "cancelled", assignedVehicleId: CAB_A, assignedDriverId: DRV_A })
    ];
    const request = cabRow({ _id: "new", assignedDriverId: DRV_A });
    assert.equal(collectBlockingForVehicle(existing, CAB_A, request).length, 0);
    assert.equal(collectBlockingForDriver(existing, DRV_A, request).length, 0);
  });

  it("TEST 13: finished booking remains history and does not block", () => {
    const existing = [cabRow({ status: "finished", assignedDriverId: DRV_A })];
    const request = cabRow({ _id: "new", assignedDriverId: DRV_A });
    assert.equal(collectBlockingForVehicle(existing, CAB_A, request).length, 0);
    assert.equal(collectBlockingForDriver(existing, DRV_A, request).length, 0);
  });

  it("TEST 14: super admin is not vendor-scoped by catalogOwnedByVendor checks", () => {
    const itemB = { _id: CAB_B, vendorAdminPhone: "9000000002" };
    assert.doesNotThrow(() =>
      assertVendorOwnsBookableItem({ user: { role: "super_admin", mobileNumber: "9990000000" } }, "cab", itemB)
    );
  });

  it("TEST 15: customer cab create stamps assignedVehicleId from itemId, ignoring client assignment", () => {
    const payload = stampCreateAssignments({
      type: "cab",
      itemId: CAB_A,
      status: "pending"
    });
    assert.equal(String(payload.assignedVehicleId), CAB_A);
    const driverPayload = stampCreateAssignments({ type: "driver", itemId: DRV_A });
    assert.equal(String(driverPayload.assignedDriverId), DRV_A);
  });

  it("expired pending cannot be confirmed", () => {
    const booking = cabRow({
      status: "pending",
      expiresAt: new Date("2026-08-20T01:00:00.000Z")
    });
    assert.throws(
      () => assertPendingHoldValid(booking, new Date("2026-08-20T04:00:00.000Z")),
      (err) => err instanceof HttpError && err.statusCode === 409 && err.message === HOLD_EXPIRED
    );
  });

  it("pending before expiry can be confirmed", () => {
    const booking = cabRow({
      status: "pending",
      expiresAt: new Date("2026-08-20T07:00:00.000Z")
    });
    assert.doesNotThrow(() => assertPendingHoldValid(booking, new Date("2026-08-20T03:00:00.000Z")));
  });

  it("cannot reassign cancelled or finished bookings", () => {
    assert.throws(
      () => assertReassignmentAllowed(cabRow({ status: "cancelled" })),
      (err) => err.statusCode === 400
    );
    assert.throws(
      () => assertReassignmentAllowed(cabRow({ status: "finished" })),
      (err) => err.statusCode === 400
    );
    assert.doesNotThrow(() =>
      assertReassignmentAllowed(
        cabRow({
          status: "pending",
          startAt: new Date("2099-01-01T03:30:00.000Z"),
          endAt: new Date("2099-01-01T07:30:00.000Z")
        })
      )
    );
  });
});
