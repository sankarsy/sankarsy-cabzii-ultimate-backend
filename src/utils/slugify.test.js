"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { slugify, escapeRegex, activeDocumentsFilter } = require("./slugify");

describe("slugify helpers", () => {
  it("builds URL slugs", () => {
    assert.equal(slugify("Chennai City"), "chennai-city");
  });

  it("escapes regex metacharacters", () => {
    assert.equal(escapeRegex("a+b"), "a\\+b");
  });

  it("treats missing isActive as active", () => {
    assert.deepEqual(activeDocumentsFilter(true), { isActive: { $ne: false } });
    assert.deepEqual(activeDocumentsFilter(false), {});
  });
});
