"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { applyCoupon } = require("./coupons");
const { composeFare } = require("./bookingFare");
const { stripUntrustedPricing, applyFareSnapshot } = require("./bookingIntegrity");

describe("coupon validation", () => {
  it("rejects unknown codes", () => {
    const result = applyCoupon({
      code: "FREE9999",
      serviceType: "cab",
      tripType: "outstation",
      date: "2026-08-16",
      baseFare: 3000,
      priorCompletedBookings: 0
    });
    assert.equal(result.applied, false);
    assert.equal(result.discount, 0);
  });

  it("CABZII500 applies flat 500 on first outstation cab booking over min fare", () => {
    const result = applyCoupon({
      code: "cabzii500",
      serviceType: "cab",
      tripType: "outstation",
      date: "2026-08-16",
      baseFare: 3000,
      priorCompletedBookings: 0
    });
    assert.equal(result.applied, true);
    assert.equal(result.discount, 500);
    assert.equal(result.code, "CABZII500");
  });

  it("CABZII500 does not apply below min fare", () => {
    const result = applyCoupon({
      code: "CABZII500",
      serviceType: "cab",
      tripType: "outstation",
      date: "2026-08-16",
      baseFare: 1400,
      priorCompletedBookings: 0
    });
    assert.equal(result.discount, 0);
  });

  it("CABZII500 does not apply after a completed booking", () => {
    const result = applyCoupon({
      code: "CABZII500",
      serviceType: "cab",
      tripType: "outstation",
      date: "2026-08-16",
      baseFare: 3000,
      priorCompletedBookings: 1
    });
    assert.equal(result.discount, 0);
  });

  it("FIRST100 applies on local cab for first booking", () => {
    const result = applyCoupon({
      code: "FIRST100",
      serviceType: "cab",
      tripType: "local",
      date: "2026-08-16",
      baseFare: 1200,
      priorCompletedBookings: 0
    });
    assert.equal(result.discount, 100);
  });

  it("WEEKEND10 is 10% airport weekend with max 400", () => {
    const result = applyCoupon({
      code: "WEEKEND10",
      serviceType: "cab",
      tripType: "airport",
      date: "2026-08-16",
      baseFare: 5000,
      priorCompletedBookings: 0
    });
    assert.equal(result.discount, 400);
  });

  it("WEEKEND10 does not apply on a weekday", () => {
    const result = applyCoupon({
      code: "WEEKEND10",
      serviceType: "cab",
      tripType: "airport",
      date: "2026-08-17",
      baseFare: 2000,
      priorCompletedBookings: 0
    });
    assert.equal(result.discount, 0);
  });

  it("does not apply cab coupons to bus or tour", () => {
    const bus = applyCoupon({
      code: "CABZII500",
      serviceType: "bus",
      tripType: "bus",
      date: "2026-08-16",
      baseFare: 3000,
      priorCompletedBookings: 0
    });
    assert.equal(bus.discount, 0);
  });

  it("TEST 4: client couponDiscount is ignored; server discount is used", () => {
    const couponResult = applyCoupon({
      code: "CABZII500",
      serviceType: "cab",
      tripType: "outstation",
      date: "2026-08-16",
      baseFare: 3000,
      priorCompletedBookings: 0
    });
    const snapshot = composeFare({
      baseFare: 3000,
      couponResult,
      pricingSource: "package"
    });
    const stored = applyFareSnapshot(
      stripUntrustedPricing({ amount: 1, discount: 5000, couponDiscount: 5000, coupon: "CABZII500" }),
      snapshot
    );
    assert.equal(stored.discount, 500);
    assert.equal(stored.finalAmount, 2500);
    assert.equal(stored.amount, 2500);
    assert.equal(stored.couponCode, "CABZII500");
  });
});
