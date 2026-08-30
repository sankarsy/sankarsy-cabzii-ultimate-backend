"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  shouldDropSpam,
  hasMinimumIntent,
  resolveLeadSource,
  resolveStage,
  mapProductType,
  buildLeadFields,
  applyLeadUpdates
} = require("./quoteLeadEnquiry");

describe("quoteLeadEnquiry", () => {
  it("rejects honeypot and link-stuffed names", () => {
    assert.equal(shouldDropSpam({ website: "http://spam.test" }), true);
    assert.equal(shouldDropSpam({ name: "http://spam.test", mobile: "9876543210" }), true);
    assert.equal(shouldDropSpam({ name: "Priya", mobile: "9876543210" }), false);
  });

  it("requires a valid mobile plus pickup, drop, page or trip", () => {
    assert.equal(hasMinimumIntent({ mobile: "9876543210" }), false);
    assert.equal(hasMinimumIntent({ mobile: "9876543210", pickup: "T Nagar" }), true);
    assert.equal(hasMinimumIntent({ mobile: "12345", pickup: "T Nagar" }), false);
    assert.equal(hasMinimumIntent({ mobile: "9876543210", sourcePage: "/cabs/passenger" }), true);
  });

  it("maps WhatsApp CTA to whatsapp_quote and other CTAs to website_enquiry", () => {
    assert.equal(resolveLeadSource({ ctaLocation: "otp_login" }), "whatsapp_quote");
    assert.equal(resolveLeadSource({ ctaLocation: "passenger_details" }), "website_enquiry");
    assert.equal(resolveLeadSource({ source: "whatsapp_quote" }), "whatsapp_quote");
  });

  it("aliases converted/closed onto existing CRM stages", () => {
    assert.equal(resolveStage("converted"), "confirmed");
    assert.equal(resolveStage("closed"), "lost");
    assert.equal(resolveStage("contacted"), "contacted");
    assert.equal(resolveStage("nope"), "");
  });

  it("keeps cab/driver/bus/tour product types", () => {
    assert.equal(mapProductType("driver"), "driver");
    assert.equal(mapProductType("airport"), "cab");
  });

  it("reuses an existing lead instead of wiping quoteRef", () => {
    const lead = {
      quoteRef: "CZQ-KEEP",
      source: "website_enquiry",
      boardingPoint: "Chennai",
      whatsappSent: false
    };
    applyLeadUpdates(
      lead,
      buildLeadFields(
        {
          mobile: "9876543210",
          pickup: "T Nagar",
          drop: "MAA",
          ctaLocation: "whatsapp_quote",
          source: "whatsapp_quote"
        },
        {}
      )
    );
    assert.equal(lead.quoteRef, "CZQ-KEEP");
    assert.equal(lead.boardingPoint, "T Nagar");
    assert.equal(lead.whatsappSent, true);
  });
});
