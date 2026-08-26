"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { normalizeCabForApi } = require("./catalogNormalize");

const sample = {
  _id: "cab1",
  title: "Dzire",
  vendor: "MULTI TRAVELS",
  vendorAdminPhone: "8220873545",
  type: "Sedan",
  category: "Sedan",
  seats: 4,
  price: 2500,
  city: "Chennai",
  status: "active",
  availabilityStatus: "available",
  registrationNumber: "TN01AB1234",
  isDeleted: false
};

describe("normalizeCabForApi registration privacy", () => {
  it("omits registrationNumber from customer/public responses", () => {
    const publicDoc = normalizeCabForApi(sample);
    assert.equal(Object.prototype.hasOwnProperty.call(publicDoc, "registrationNumber"), false);
    assert.equal(publicDoc.registrationNumber, undefined);
  });

  it("omits vendorAdminPhone and verificationStatus from customer/public responses", () => {
    const publicDoc = normalizeCabForApi(sample);
    assert.equal(Object.prototype.hasOwnProperty.call(publicDoc, "vendorAdminPhone"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(publicDoc, "verificationStatus"), false);
  });

  it("keeps registrationNumber on admin/operations serialization", () => {
    const adminDoc = normalizeCabForApi(sample, { includeRegistration: true });
    assert.equal(adminDoc.registrationNumber, "TN01AB1234");
    assert.equal(adminDoc.vendorAdminPhone, "8220873545");
  });
});
