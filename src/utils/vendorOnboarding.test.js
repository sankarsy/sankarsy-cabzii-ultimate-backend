"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { missingCabPublishFields, makeQuoteRef } = require("./vendorOnboarding");
const { IMAGE_UPLOAD_RULES, sizeErrorMessage, dimensionErrorMessage } = require("./imageUploadRules");

describe("vendorOnboarding", () => {
  it("requires name, seats, primary image and pricing before Active", () => {
    assert.deepEqual(missingCabPublishFields({}), [
      "vehicle name",
      "seating capacity",
      "primary image",
      "pricing"
    ]);
  });

  it("accepts a complete cab payload", () => {
    assert.deepEqual(
      missingCabPublishFields({
        title: "Force Traveller #1",
        seats: 17,
        image: "/uploads/traveller.webp",
        farePackages: { local8hr: { price: 4500 } }
      }),
      []
    );
  });

  it("makeQuoteRef uses CZQ- prefix without ambiguous characters", () => {
    const ref = makeQuoteRef();
    assert.match(ref, /^CZQ-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
  });
});

describe("imageUploadRules", () => {
  it("caps uploads at 1 MB", () => {
    assert.equal(IMAGE_UPLOAD_RULES.maxBytes, 1024 * 1024);
    assert.match(sizeErrorMessage(2.4 * 1024 * 1024), /2\.4 MB/);
    assert.match(sizeErrorMessage(2.4 * 1024 * 1024), /1 MB/);
  });

  it("describes the minimum pixel size", () => {
    assert.equal(IMAGE_UPLOAD_RULES.minWidth, 1200);
    assert.equal(IMAGE_UPLOAD_RULES.minHeight, 750);
    assert.match(dimensionErrorMessage(800, 600), /800 × 600/);
  });
});
