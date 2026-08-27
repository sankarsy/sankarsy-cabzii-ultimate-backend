"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { contactPhoneDigits, digitsPhone, vendorOwningAdminPhone } = require("./vendorPhone");

describe("vendorPhone", () => {
  it("normalizes Indian mobiles and formatted contact numbers", () => {
    assert.equal(digitsPhone("98765 43210"), "9876543210");
    assert.equal(contactPhoneDigits("+91 98765-43210"), "9876543210");
    assert.equal(contactPhoneDigits(""), "");
    assert.equal(contactPhoneDigits("1234567890123"), "1234567890123");
  });

  it("rejects short contact phones", () => {
    assert.throws(() => contactPhoneDigits("12345"), /10–15 digits/);
  });

  it("treats a vendor's own formatted admin phone as free on edit", () => {
    const vendors = [
      { _id: "a", name: "SwiftRide", adminPhone: "+91 90000 00001" },
      { _id: "b", name: "Other", adminPhone: "9000000002" }
    ];
    assert.equal(vendorOwningAdminPhone(vendors, "9000000001", "a"), null);
    assert.equal(vendorOwningAdminPhone(vendors, "9000000001", "b")?.name, "SwiftRide");
    assert.equal(vendorOwningAdminPhone(vendors, "9000000001")?.name, "SwiftRide");
  });
});
