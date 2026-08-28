"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { missingCabPublishFields, makeQuoteRef } = require("./vendorOnboarding");
const { IMAGE_UPLOAD_RULES, sizeErrorMessage } = require("./imageUploadRules");

describe("vendorOnboarding", () => {
  it("requires name, seats and pricing before Active", () => {
    assert.deepEqual(missingCabPublishFields({}), [
      "vehicle name",
      "seating capacity",
      "pricing"
    ]);
  });

  it("accepts a complete cab payload", () => {
    assert.deepEqual(
      missingCabPublishFields({
        title: "Force Traveller #1",
        seats: 17,
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
  it("caps uploads at 12 MB original", () => {
    assert.equal(IMAGE_UPLOAD_RULES.maxBytes, 12 * 1024 * 1024);
    assert.match(sizeErrorMessage(13 * 1024 * 1024), /13\.0 MB/);
    assert.match(sizeErrorMessage(13 * 1024 * 1024), /12 MB/);
  });

  it("does not require a minimum pixel size", () => {
    assert.equal(IMAGE_UPLOAD_RULES.minWidth, 0);
    assert.equal(IMAGE_UPLOAD_RULES.minHeight, 0);
  });
});
