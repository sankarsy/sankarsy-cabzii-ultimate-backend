"use strict";

const SEO_KEYS = ["seo", "seoTitle", "seoDescription"];

/**
 * Pull SEO string fields off the request body so Joi never sees them (avoids
 * `object.unknown` / "seo is not allowed" if an older schema or strict mode
 * mismatches). Merge the returned strings back after `validate()`.
 */
function splitSeoStrings(body) {
  const raw = body && typeof body === "object" ? { ...body } : {};
  const seo = {};
  for (const key of SEO_KEYS) {
    const v = raw[key];
    seo[key] = typeof v === "string" ? v : v == null ? "" : String(v);
    delete raw[key];
  }
  return { core: raw, ...seo };
}

module.exports = { splitSeoStrings };
