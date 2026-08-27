"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  sanitizeAttribution,
  sanitizeSeoEvent,
  rateOrNA,
  bookingFareGmv,
  parsePeriod,
  recommendNoindex,
  inferCitySlug,
  operationalServiceKey
} = require("./seoRevenueMath");

describe("SEO revenue math", () => {
  it("rejects attribution outside the 7-day window", () => {
    const old = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    assert.equal(
      sanitizeAttribution({ landingPage: "/services/airport-taxi/chennai", viewedAt: old }),
      null
    );
  });

  it("accepts attribution inside the window", () => {
    const viewedAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const row = sanitizeAttribution({
      landingPage: "/routes/chennai-to-tirupati-cab",
      pageType: "route",
      viewedAt,
      sessionId: "abc"
    });
    assert.equal(row.landingPage, "/routes/chennai-to-tirupati-cab");
    assert.equal(row.windowHours, 168);
  });

  it("does not treat protocol-relative URLs as landings", () => {
    assert.equal(
      sanitizeAttribution({ landingPage: "//evil.example/phish", viewedAt: new Date().toISOString() }),
      null
    );
  });

  it("returns N/A when conversion denominator is missing", () => {
    const r = rateOrNA(3, 0);
    assert.equal(r.available, false);
    assert.equal(r.label, "N/A");
  });

  it("uses finalAmount for GMV not tariff fiction", () => {
    assert.equal(bookingFareGmv({ finalAmount: 4500, amount: 1200 }), 4500);
    assert.equal(bookingFareGmv({ amount: 1200 }), 1200);
  });

  it("defaults period to last 30 days", () => {
    const p = parsePeriod({}, new Date("2026-08-27T12:00:00Z"));
    assert.equal(p.label, "Last 30 days");
    assert.equal(p.days, 30);
  });

  it("keeps noindex when there is no GSC and no bookings", () => {
    assert.equal(recommendNoindex({ impressions: null, clicks: null, completedBookings: 0, gmv: 0 }), "KEEP NOINDEX");
  });

  it("infers Chennai from pickup text without inventing GMV", () => {
    assert.equal(inferCitySlug("T. Nagar, Chennai"), "chennai");
    assert.equal(operationalServiceKey({ type: "cab", serviceTripType: "airport" }), "airport-taxi");
  });

  it("rejects unknown seo event names", () => {
    assert.equal(sanitizeSeoEvent({ eventName: "purchase", landingPage: "/cab-booking/chennai" }), null);
  });

  it("catalogs the 37 noindex URLs without changing indexation", () => {
    const paths = require("../data/seoNoindexPaths.json");
    assert.equal(paths.length, 37);
    assert.ok(paths.every((p) => String(p).startsWith("/")));
  });
});
