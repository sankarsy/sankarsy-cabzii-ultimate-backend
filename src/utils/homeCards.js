"use strict";

function homeCardDedupeKey(row = {}) {
  return [
    String(row.section || "").trim().toLowerCase(),
    String(row.title || "").trim().toLowerCase(),
    String(row.href || "").trim().toLowerCase()
  ].join("|");
}

/** Keep the first (newest) card per section+title+href. */
function dedupeHomeCards(rows = []) {
  const seen = new Set();
  const unique = [];
  for (const row of rows) {
    if (!row) continue;
    const key = homeCardDedupeKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(row);
  }
  return unique;
}

module.exports = { homeCardDedupeKey, dedupeHomeCards };
