"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { publicGscStatus } = require("./gscConfig");

describe("GSC config", () => {
  it("does not invent credentials when env is empty", () => {
    const status = publicGscStatus();
    assert.equal(typeof status.configured, "boolean");
    if (!process.env.GSC_SITE_URL || (!process.env.GSC_CLIENT_EMAIL && !process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.GSC_SERVICE_ACCOUNT_JSON)) {
      assert.equal(status.configured, false);
      assert.equal(status.note, "GSC DATA NOT CONNECTED");
    }
    assert.ok(!JSON.stringify(status).includes("BEGIN PRIVATE KEY"));
    assert.ok(Array.isArray(status.setupRequirement));
    assert.equal(status.canonicalOrigin, process.env.GSC_CANONICAL_ORIGIN || "https://www.cabzii.in");
  });
});
