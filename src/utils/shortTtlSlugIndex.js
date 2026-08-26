"use strict";

/**
 * Short-lived existence index so SSG/build storms do not issue one Mongo
 * findOne per missing SEO slug. Successful hits still load the full document.
 */
function createSlugIndex(loadSlugs, ttlMs = 60 * 1000) {
  let slugs = null;
  let loadedAt = 0;
  let pending = null;

  async function getSet() {
    if (slugs && Date.now() - loadedAt < ttlMs) return slugs;
    if (pending) return pending;
    pending = Promise.resolve()
      .then(() => loadSlugs())
      .then((list) => {
        slugs = new Set((list || []).map((s) => String(s || "")).filter(Boolean));
        loadedAt = Date.now();
        pending = null;
        return slugs;
      })
      .catch((err) => {
        pending = null;
        throw err;
      });
    return pending;
  }

  async function hasSlug(slug) {
    const set = await getSet();
    return set.has(String(slug || ""));
  }

  function invalidate() {
    slugs = null;
    loadedAt = 0;
    pending = null;
  }

  return { hasSlug, invalidate };
}

module.exports = { createSlugIndex };
