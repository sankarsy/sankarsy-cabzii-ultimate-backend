"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { createSlugIndex } = require("./shortTtlSlugIndex");

describe("shortTtlSlugIndex", () => {
  it("loads slugs once and treats missing keys as absent", async () => {
    let loads = 0;
    const index = createSlugIndex(async () => {
      loads += 1;
      return ["chennai-to-madurai-cab"];
    }, 60_000);
    assert.equal(await index.hasSlug("chennai-to-madurai-cab"), true);
    assert.equal(await index.hasSlug("missing-route"), false);
    assert.equal(await index.hasSlug("chennai-to-madurai-cab"), true);
    assert.equal(loads, 1);
  });
});
