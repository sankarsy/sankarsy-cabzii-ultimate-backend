"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeRegistrationNumber,
  sanitizeInventoryPayload,
  isPublicVehicleStatus,
  VENDOR_STATUSES
} = require("./vehicleInventory");

describe("vehicleInventory", () => {
  it("normalizes Indian plates to a compact uppercase form", () => {
    assert.equal(normalizeRegistrationNumber("tn 01 ab 1234"), "TN01AB1234");
    assert.equal(normalizeRegistrationNumber("TN-38-XY-5678"), "TN38XY5678");
    assert.equal(normalizeRegistrationNumber("  "), "");
  });

  it("ignores vendorId from the body for vendor_admin", () => {
    const req = { user: { role: "vendor_admin" } };
    const next = sanitizeInventoryPayload(
      req,
      { vendorId: "9000000002", title: "Dzire", status: "draft", availabilityStatus: "available" },
      { verificationStatus: "pending" }
    );
    assert.equal(next.vendorId, undefined);
    assert.equal(next.verificationStatus, "pending");
  });

  it("blocks vendor from setting suspended or busy", () => {
    const req = { user: { role: "vendor_admin" } };
    assert.throws(
      () => sanitizeInventoryPayload(req, { status: "suspended" }, {}),
      /cannot set that vehicle status/
    );
    const next = sanitizeInventoryPayload(
      req,
      { availabilityStatus: "busy" },
      { availabilityStatus: "available" }
    );
    assert.equal(next.availabilityStatus, "available");
  });

  it("lets super admin set suspended and verification", () => {
    const req = { user: { role: "super_admin" } };
    const next = sanitizeInventoryPayload(req, {
      vendorId: "ignored",
      status: "suspended",
      verificationStatus: "approved",
      availabilityStatus: "blocked"
    });
    assert.equal(next.vendorId, undefined);
    assert.equal(next.status, "suspended");
    assert.equal(next.verificationStatus, "approved");
    assert.equal(next.availabilityStatus, "blocked");
  });

  it("does not let a vendor self-verify documents on create", () => {
    const req = { user: { role: "vendor_admin" } };
    const next = sanitizeInventoryPayload(
      req,
      { vehicleDocuments: [{ docType: "rc", url: "/uploads/rc.png", status: "verified" }] },
      null
    );
    assert.equal(next.vehicleDocuments[0].status, "pending");
  });

  it("only active status is public catalog", () => {
    assert.equal(isPublicVehicleStatus("active"), true);
    assert.equal(isPublicVehicleStatus("draft"), false);
    assert.equal(isPublicVehicleStatus("maintenance"), false);
    assert.equal(isPublicVehicleStatus("under_verification"), false);
    assert.equal(VENDOR_STATUSES.includes("active"), true);
  });

  it("rejects a duplicate registration number", async () => {
    const { assertUniqueRegistration } = require("./vehicleInventory");
    const fakeCab = {
      findOne: () => ({
        select: () => ({ lean: async () => ({ _id: "other", registrationNumber: "TN01AB1234" }) })
      })
    };
    await assert.rejects(
      () => assertUniqueRegistration(fakeCab, "tn 01 ab 1234"),
      /already on another Cabzii vehicle/
    );
  });

  it("allows an empty plate and the same vehicle keeping its plate", async () => {
    const { assertUniqueRegistration } = require("./vehicleInventory");
    let queried = null;
    const fakeCab = {
      findOne: (q) => {
        queried = q;
        return { select: () => ({ lean: async () => null }) };
      }
    };
    await assertUniqueRegistration(fakeCab, "  ");
    assert.equal(queried, null);
    await assertUniqueRegistration(fakeCab, "TN01AB1234", "same-id");
    assert.equal(queried.registrationNumber, "TN01AB1234");
    assert.deepEqual(queried._id, { $ne: "same-id" });
  });
});
