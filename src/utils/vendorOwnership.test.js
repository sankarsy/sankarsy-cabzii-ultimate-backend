"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  isGenericVendorName,
  classifyCatalogOwnership,
  classifyBookingOwnership,
  indexVendorAccounts
} = require("./vendorOwnership");

const accounts = indexVendorAccounts(
  [{ name: "abc", adminPhone: "9999999916" }],
  [{ mobileNumber: "9999999916", vendorName: "abc" }]
);

describe("vendor ownership classification", () => {
  it("treats Cabzii Partner as generic, never MATCHED by name", () => {
    assert.equal(isGenericVendorName("Cabzii Partner"), true);
    const result = classifyCatalogOwnership({ vendor: "Cabzii Partner", vendorAdminPhone: "" }, accounts);
    assert.equal(result.status, "AMBIGUOUS");
    assert.equal(result.proposedVendorAdminPhone, "");
  });

  it("MATCHED only when catalog phone maps to exactly one account", () => {
    const result = classifyCatalogOwnership(
      { vendor: "anything", vendorAdminPhone: "9999999916" },
      accounts
    );
    assert.equal(result.status, "MATCHED");
    assert.equal(result.proposedVendorAdminPhone, "9999999916");
    assert.equal(result.proposedVendor, "abc");
  });

  it("MATCHED on exact vendor name when that Vendor has adminPhone", () => {
    const result = classifyCatalogOwnership({ vendor: "abc", vendorAdminPhone: "" }, accounts);
    assert.equal(result.status, "MATCHED");
    assert.equal(result.proposedVendor, "abc");
    assert.equal(result.proposedVendorAdminPhone, "9999999916");
  });

  it("does not match a different exact name", () => {
    const result = classifyCatalogOwnership({ vendor: "SwiftRide Chennai", vendorAdminPhone: "" }, accounts);
    assert.equal(result.status, "UNMATCHED");
    assert.equal(result.proposedVendorAdminPhone, "");
  });

  it("UNMATCHED when catalog phone and name are empty", () => {
    const result = classifyCatalogOwnership({ vendor: "", vendorAdminPhone: "" }, accounts);
    assert.equal(result.status, "UNMATCHED");
  });

  it("booking with empty-vendor cab is not auto-assigned to abc", () => {
    const booking = { _id: "b1", itemId: "c1", type: "cab", vendor: "", vendorAdminPhone: "" };
    const cab = { _id: "c1", vendor: "", vendorAdminPhone: "" };
    const row = classifyBookingOwnership(booking, cab, accounts);
    assert.equal(row.status, "UNMATCHED");
    assert.equal(row.proposedVendor, "");
  });
});
