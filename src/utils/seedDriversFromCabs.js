"use strict";

/** Disabled — public driver catalog is unused. Call Driver does not use these rows. */
async function seedDriversFromCabsIfEmpty() {
  return { created: 0, skipped: true, reason: "driver_catalog_removed" };
}

module.exports = { seedDriversFromCabsIfEmpty };
