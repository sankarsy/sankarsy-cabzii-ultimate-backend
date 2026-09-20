"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  canonicalizeGscPage,
  parseLandingMeta,
  gscSafeRange,
  ymd
} = require("./gscCanonical");

describe("GSC canonical page matching", () => {
  it("strips protocol, www, trailing slash, and query strings", () => {
    assert.equal(
      canonicalizeGscPage("https://www.cabzii.in/services/airport-taxi/chennai/?utm=1"),
      "/services/airport-taxi/chennai"
    );
    assert.equal(
      canonicalizeGscPage("http://cabzii.in/services/airport-taxi/chennai"),
      "/services/airport-taxi/chennai"
    );
  });

  it("keeps city-cabs landings and folds legacy city hubs onto them", () => {
    assert.equal(canonicalizeGscPage("/car-rental/chennai-city-cabs"), "/car-rental/chennai-city-cabs");
    assert.equal(canonicalizeGscPage("/cab-booking/chennai"), "/car-rental/chennai-city-cabs");
    assert.equal(canonicalizeGscPage("/travels/chennai"), "/car-rental/chennai-city-cabs");
    assert.equal(canonicalizeGscPage("/acting-driver/chennai"), "/call-drivers-chennai");
    assert.equal(canonicalizeGscPage("/acting-driver/madurai"), "/acting-driver/madurai");
    const hub = parseLandingMeta("/cab-booking/chennai");
    assert.equal(hub.pageType, "city-hub");
    assert.equal(hub.city, "chennai");
    const driver = parseLandingMeta("/acting-driver/chennai");
    assert.equal(driver.pageType, "acting-driver");
    assert.equal(driver.city, "chennai");
    assert.equal(driver.landingPage, "/call-drivers-chennai");
  });

  it("folds service aliases onto canonical /services paths", () => {
    assert.equal(canonicalizeGscPage("/car-rental/Chennai"), "/services/car-rental/chennai");
    assert.equal(canonicalizeGscPage("/holiday-packages/madurai"), "/services/tour-packages/madurai");
  });

  it("does not treat taxi route aliases as a second page", () => {
    assert.equal(
      canonicalizeGscPage("https://www.cabzii.in/routes/chennai-to-tirupati-taxi"),
      "/routes/chennai-to-tirupati-cab"
    );
  });

  it("parses city/service/origin from canonical landings", () => {
    const airport = parseLandingMeta("/services/airport-taxi/chennai");
    assert.equal(airport.city, "chennai");
    assert.equal(airport.service, "airport-taxi");
    const route = parseLandingMeta("/routes/chennai-to-tirupati-cab");
    assert.equal(route.origin, "chennai");
    assert.equal(route.destination, "tirupati");
  });

  it("marks GSC range as lagging the booking end date", () => {
    const period = {
      start: new Date("2026-08-01T00:00:00"),
      end: new Date("2026-08-27T23:59:59")
    };
    const now = new Date("2026-08-27T12:00:00");
    const range = gscSafeRange(period, now);
    assert.equal(range.gsc.end, "2026-08-24");
    assert.equal(range.rangesDiffer, true);
    assert.ok(range.warning);
    assert.equal(ymd(period.start), "2026-08-01");
  });
});
