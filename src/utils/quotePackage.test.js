"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { buildQuotePdfBuffer } = require("./quotePdf");
const { buildQuoteText, formatQuoteLines } = require("./quotePackage");

describe("quotePackage", () => {
  it("includes vehicle, route and fare in text", () => {
    const text = buildQuoteText(
      {
        quoteRef: "CZQ-TEST12",
        vehicleName: "Swift Dzire",
        tripType: "airport",
        pickup: "Tiruchirappalli",
        drop: "Salem",
        travelDate: "2026-08-25",
        pickupTime: "09:00",
        distanceKm: 145,
        estimatedFare: 2775,
        mobile: "8220870386"
      },
      { pdfUrl: "https://cabzii.in/q.pdf", viewUrl: "https://cabzii.in/quote/CZQ-TEST12" }
    );
    assert.match(text, /Swift Dzire/);
    assert.match(text, /PACKAGE DETAILS/i);
    assert.match(text, /PDF copy/);
    assert.match(text, /2,775/);
  });

  it("builds a PDF buffer", () => {
    const buf = buildQuotePdfBuffer({
      quoteRef: "CZQ-TEST12",
      vehicleName: "Swift Dzire",
      pickup: "Tiruchirappalli",
      drop: "Salem",
      estimatedFare: 2775
    });
    assert.ok(buf.length > 200);
    assert.equal(buf.subarray(0, 5).toString(), "%PDF-");
    assert.ok(formatQuoteLines({ vehicleName: "Dzire" }).includes("Vehicle: Dzire"));
  });
});
