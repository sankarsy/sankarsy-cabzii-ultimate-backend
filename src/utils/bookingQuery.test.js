"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { buildCustomerBookingQuery, bookingOwnedByUser } = require("./bookingQuery");

describe("customer booking access", () => {
  it("TEST 8: customer queries are scoped to the authenticated user, not admin", () => {
    const user = { _id: "64c0000000000000000000cc", mobileNumber: "9888888888" };
    const query = buildCustomerBookingQuery(user);
    assert.ok(query.$or);
    assert.ok(query.$or.some((clause) => clause.user === user._id));
    assert.equal(JSON.stringify(query).includes("vendorAdminPhone"), false);
  });

  it("a customer does not own another customer's booking", () => {
    const booking = { user: "64c0000000000000000000cc", phone: "9888888888" };
    assert.equal(
      bookingOwnedByUser(booking, { _id: "64c0000000000000000000dd", mobileNumber: "9777777777" }),
      false
    );
    assert.equal(
      bookingOwnedByUser(booking, { _id: "64c0000000000000000000cc", mobileNumber: "9888888888" }),
      true
    );
  });
});
