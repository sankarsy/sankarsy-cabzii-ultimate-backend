"use strict";

const { SearchConsoleSnapshot } = require("../models/SearchConsoleSnapshot");
const { getGscConfig } = require("../utils/gscConfig");
const { canonicalizeGscPage } = require("../utils/gscCanonical");
const { querySearchAnalytics } = require("./gscSearchConsoleClient");

function mapPageRows(rows, ctx) {
  return rows.map((row) => {
    const keys = row.keys || [];
    const landingPage = canonicalizeGscPage(keys[0] || "", ctx.canonicalOrigin);
    const impressions = Number(row.impressions) || 0;
    const clicks = Number(row.clicks) || 0;
    return {
      keyword: "",
      landingPage,
      clicks,
      impressions,
      ctr: impressions ? clicks / impressions : Number(row.ctr) || 0,
      position: Number(row.position) || 0,
      country: "",
      device: "",
      searchAppearance: "",
      source: "gsc_api",
      dimension: "page",
      property: ctx.property,
      startDate: ctx.startDate,
      endDate: ctx.endDate,
      snapshotDate: ctx.endDate
    };
  }).filter((r) => r.landingPage);
}

function mapQueryRows(rows, ctx) {
  return rows.map((row) => {
    const keys = row.keys || [];
    const keyword = String(keys[0] || "").slice(0, 200);
    const landingPage = canonicalizeGscPage(keys[1] || "", ctx.canonicalOrigin);
    const impressions = Number(row.impressions) || 0;
    const clicks = Number(row.clicks) || 0;
    return {
      keyword,
      landingPage,
      clicks,
      impressions,
      ctr: impressions ? clicks / impressions : Number(row.ctr) || 0,
      position: Number(row.position) || 0,
      country: "",
      device: "",
      searchAppearance: "",
      source: "gsc_api",
      dimension: "query_page",
      property: ctx.property,
      startDate: ctx.startDate,
      endDate: ctx.endDate,
      snapshotDate: ctx.endDate
    };
  }).filter((r) => r.keyword);
}

async function syncSearchConsole({ startDate, endDate }) {
  const cfg = getGscConfig();
  if (!cfg.configured) {
    const err = new Error("GSC DATA NOT CONNECTED");
    err.code = "GSC_NOT_CONFIGURED";
    throw err;
  }
  const ctx = {
    property: cfg.property,
    canonicalOrigin: cfg.canonicalOrigin,
    startDate,
    endDate
  };

  const [pageRows, queryRows] = await Promise.all([
    querySearchAnalytics({ startDate, endDate, dimensions: ["page"] }),
    querySearchAnalytics({ startDate, endDate, dimensions: ["query", "page"] })
  ]);

  const docs = [...mapPageRows(pageRows, ctx), ...mapQueryRows(queryRows, ctx)];
  await SearchConsoleSnapshot.deleteMany({
    source: "gsc_api",
    startDate,
    endDate
  });
  if (docs.length) {
    await SearchConsoleSnapshot.insertMany(docs, { ordered: false });
  }
  return {
    property: cfg.property,
    startDate,
    endDate,
    pageRows: pageRows.length,
    queryRows: queryRows.length,
    stored: docs.length
  };
}

module.exports = { syncSearchConsole, mapPageRows, mapQueryRows };
