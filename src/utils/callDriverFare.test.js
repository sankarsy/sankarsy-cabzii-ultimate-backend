"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { quoteCallDriver, isNightPickup } = require("./callDriverFare");
const { DEFAULT_CALL_DRIVER_TARIFF } = require("../config/callDriverTariff");

describe("callDriverFare", () => {
  it("prices local normal 3 hours without extras", () => {
    const q = quoteCallDriver(DEFAULT_CALL_DRIVER_TARIFF, {
      serviceType: "local",
      vehicleType: "standard",
      hours: 3,
      pickupTime: "09:00"
    });
    assert.equal(q.total, 450);
    assert.equal(q.extraHours, 0);
    assert.equal(q.nightApplied, false);
  });

  it("adds extra hours at ₹100 and night charge for luxury local", () => {
    const q = quoteCallDriver(DEFAULT_CALL_DRIVER_TARIFF, {
      serviceType: "local",
      vehicleType: "premium",
      hours: 5,
      pickupTime: "22:30"
    });
    assert.equal(q.basePrice, 450);
    assert.equal(q.extraHourCharge, 200);
    assert.equal(q.nightCharge, 100);
    assert.equal(q.total, 750);
  });

  it("prices outstation return at ₹1500 per 12-hour day", () => {
    const q = quoteCallDriver(DEFAULT_CALL_DRIVER_TARIFF, {
      serviceType: "outstation",
      tripMode: "return",
      vehicleType: "premium",
      days: 2,
      hours: 24,
      pickupTime: "08:00"
    });
    assert.equal(q.basePrice, 3000);
    assert.equal(q.total, 3000);
    assert.equal(q.accommodationExtra, true);
  });

  it("counts inclusive return days from travel and return dates", () => {
    const q = quoteCallDriver(DEFAULT_CALL_DRIVER_TARIFF, {
      serviceType: "outstation",
      tripMode: "return",
      date: "2026-09-24",
      returnDate: "2026-09-26",
      hours: 36
    });
    assert.equal(q.days, 3);
    assert.equal(q.basePrice, 4500);
    assert.equal(q.extraHours, 0);
    assert.equal(q.total, 4500);
  });

  it("charges extra hours beyond 12 hours per return day", () => {
    const q = quoteCallDriver(DEFAULT_CALL_DRIVER_TARIFF, {
      serviceType: "outstation",
      tripMode: "return",
      date: "2026-09-24",
      returnDate: "2026-09-24",
      hours: 14
    });
    assert.equal(q.days, 1);
    assert.equal(q.extraHours, 2);
    assert.equal(q.total, 1700);
  });

  it("prefers date-derived days over a stale days field", () => {
    const q = quoteCallDriver(DEFAULT_CALL_DRIVER_TARIFF, {
      serviceType: "outstation",
      tripMode: "return",
      date: "2026-09-24",
      returnDate: "2026-09-25",
      days: 1,
      hours: 24
    });
    assert.equal(q.days, 2);
    assert.equal(q.total, 3000);
  });

  it("prices outstation one-way at ₹1700 including bus fare", () => {
    const q = quoteCallDriver(DEFAULT_CALL_DRIVER_TARIFF, {
      serviceType: "outstation",
      tripMode: "one_way",
      estimatedKm: 280
    });
    assert.equal(q.total, 1700);
    assert.equal(q.tripMode, "one_way");
  });

  it("calculates valet supervisors with ceiling", () => {
    const q = quoteCallDriver(DEFAULT_CALL_DRIVER_TARIFF, {
      serviceType: "valet",
      driversRequired: 21,
      hours: 5
    });
    assert.equal(q.supervisorCount, 3);
    assert.equal(q.basePrice, 21 * 600);
    assert.equal(q.supervisorCharge, 2100);
    assert.equal(q.total, 21 * 600 + 2100);
  });

  it("adds valet extra hours per driver at ₹100", () => {
    const q = quoteCallDriver(DEFAULT_CALL_DRIVER_TARIFF, {
      serviceType: "valet",
      driversRequired: 2,
      hours: 7
    });
    assert.equal(q.extraHours, 2);
    assert.equal(q.extraHourCharge, 2 * 100 * 2);
    assert.equal(q.total, 2 * 600 + 400 + 700);
  });

  it("keeps school and corporate as quote-only", () => {
    const school = quoteCallDriver(DEFAULT_CALL_DRIVER_TARIFF, { serviceType: "school" });
    const corp = quoteCallDriver(DEFAULT_CALL_DRIVER_TARIFF, { serviceType: "corporate" });
    assert.equal(school.quoteOnly, true);
    assert.equal(school.total, 0);
    assert.equal(corp.quoteMessage, "Get Corporate Quote");
  });

  it("detects night pickup from 10:15 PM to 5:30 AM", () => {
    assert.equal(isNightPickup("22:15", DEFAULT_CALL_DRIVER_TARIFF), true);
    assert.equal(isNightPickup("22:14", DEFAULT_CALL_DRIVER_TARIFF), false);
    assert.equal(isNightPickup("05:29", DEFAULT_CALL_DRIVER_TARIFF), true);
    assert.equal(isNightPickup("05:30", DEFAULT_CALL_DRIVER_TARIFF), false);
    assert.equal(isNightPickup("09:00", DEFAULT_CALL_DRIVER_TARIFF), false);
  });
});
