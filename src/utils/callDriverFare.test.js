"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { quoteCallDriver, isNightPickup } = require("./callDriverFare");
const { DEFAULT_CALL_DRIVER_TARIFF } = require("../config/callDriverTariff");

describe("callDriverFare", () => {
  it("prices local standard 4 hours without extras", () => {
    const q = quoteCallDriver(DEFAULT_CALL_DRIVER_TARIFF, {
      serviceType: "local",
      vehicleType: "standard",
      hours: 4,
      pickupTime: "09:00"
    });
    assert.equal(q.total, 500);
    assert.equal(q.extraHours, 0);
    assert.equal(q.nightApplied, false);
  });

  it("adds extra hours and night charge for premium local", () => {
    const q = quoteCallDriver(DEFAULT_CALL_DRIVER_TARIFF, {
      serviceType: "local",
      vehicleType: "premium",
      hours: 6,
      pickupTime: "22:30"
    });
    assert.equal(q.basePrice, 600);
    assert.equal(q.extraHourCharge, 200);
    assert.equal(q.nightCharge, 100);
    assert.equal(q.total, 900);
  });

  it("applies outstation >400 km premium daily rate", () => {
    const q = quoteCallDriver(DEFAULT_CALL_DRIVER_TARIFF, {
      serviceType: "outstation",
      vehicleType: "premium",
      days: 2,
      hours: 24,
      estimatedKm: 450,
      pickupTime: "08:00"
    });
    assert.equal(q.basePrice, 2600);
    assert.equal(q.longKm, true);
    assert.equal(q.total, 2600);
  });

  it("calculates valet supervisors with ceiling", () => {
    const q = quoteCallDriver(DEFAULT_CALL_DRIVER_TARIFF, {
      serviceType: "valet",
      driversRequired: 21,
      hours: 5
    });
    assert.equal(q.supervisorCount, 3);
    assert.equal(q.basePrice, 21 * 650);
    assert.equal(q.supervisorCharge, 2100);
    assert.equal(q.total, 21 * 650 + 2100);
  });

  it("adds valet extra hours per driver", () => {
    const q = quoteCallDriver(DEFAULT_CALL_DRIVER_TARIFF, {
      serviceType: "valet",
      driversRequired: 2,
      hours: 7
    });
    assert.equal(q.extraHours, 2);
    assert.equal(q.extraHourCharge, 2 * 70 * 2);
    assert.equal(q.total, 2 * 650 + 280 + 700);
  });

  it("keeps school and corporate as quote-only", () => {
    const school = quoteCallDriver(DEFAULT_CALL_DRIVER_TARIFF, { serviceType: "school" });
    const corp = quoteCallDriver(DEFAULT_CALL_DRIVER_TARIFF, { serviceType: "corporate" });
    assert.equal(school.quoteOnly, true);
    assert.equal(school.total, 0);
    assert.equal(corp.quoteMessage, "Get Corporate Quote");
  });

  it("detects night pickup across midnight", () => {
    assert.equal(isNightPickup("22:00", DEFAULT_CALL_DRIVER_TARIFF), true);
    assert.equal(isNightPickup("05:59", DEFAULT_CALL_DRIVER_TARIFF), true);
    assert.equal(isNightPickup("06:00", DEFAULT_CALL_DRIVER_TARIFF), false);
    assert.equal(isNightPickup("21:59", DEFAULT_CALL_DRIVER_TARIFF), false);
  });
});
