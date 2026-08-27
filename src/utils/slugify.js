"use strict";

function slugify(input) {
  return String(input || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Missing isActive must still count as active (legacy rows). */
function activeDocumentsFilter(activeOnly) {
  return activeOnly ? { isActive: { $ne: false } } : {};
}

module.exports = { slugify, escapeRegex, activeDocumentsFilter };
