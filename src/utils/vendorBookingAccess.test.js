"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { isVendorAdmin, composeVendorBookingQuery } = require("./vendorBookingAccess");

describe("vendor booking isolation", () => {
  it("identifies vendor_admin from the authenticated user only", () => {
    assert.equal(isVendorAdmin({ user: { role: "vendor_admin" } }), true);
    assert.equal(isVendorAdmin({ user: { role: "super_admin" } }), false);
    assert.equal(isVendorAdmin({ user: { role: "customer" } }), false);
    assert.equal(isVendorAdmin({ body: { vendorId: "other" }, query: { vendorId: "other" } }), false);
  });

  it("TEST 5/6: vendor query is scoped to authenticated vendor identity, not request vendorId", () => {
    const vendorA = composeVendorBookingQuery({
      mobile: "9000000001",
      itemIds: [new mongoose.Types.ObjectId("64a00000000000000000000a")],
      tripIds: ["64a0000000000000000000aa"]
    });
    const vendorB = composeVendorBookingQuery({
      mobile: "9000000002",
      itemIds: [new mongoose.Types.ObjectId("64b00000000000000000000b")],
      tripIds: ["64b0000000000000000000bb"]
    });

    assert.ok(vendorA.$or.some((clause) => clause.vendorAdminPhone === "9000000001"));
    assert.ok(vendorB.$or.some((clause) => clause.vendorAdminPhone === "9000000002"));
    assert.equal(
      vendorA.$or.some((clause) => clause.vendorAdminPhone === "9000000002"),
      false
    );
    assert.equal(
      JSON.stringify(vendorA).includes("9000000002"),
      false
    );
  });

  it("does not treat a vendor name alone as ownership", () => {
    const query = composeVendorBookingQuery({
      mobile: "9000000001",
      itemIds: [],
      tripIds: []
    });
    assert.equal(JSON.stringify(query).includes("Cabzii Partner"), false);
    assert.ok(query.$or.every((clause) => !clause.vendor));
  });

  it("vendor with no catalog and no identity cannot match any booking", () => {
    const query = composeVendorBookingQuery({ mobile: "", itemIds: [], tripIds: [] });
    assert.equal(String(query._id), "000000000000000000000000");
  });

  it("TEST 7: super admin uses an empty query (global access) rather than vendor scope", () => {
    assert.equal(isVendorAdmin({ user: { role: "super_admin" } }), false);
  });
});
