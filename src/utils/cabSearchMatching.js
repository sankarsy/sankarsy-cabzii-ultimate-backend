"use strict";

const { matchCabs } = require("../services/vendorMatchingService");

/**
 * Customer cab search ranking. Uses Phase 1 city/service-area matching.
 * Never reads vendorId. Not GPS.
 */
function customerSearchRequest(query = {}) {
  return {
    pickupCity: String(query.priorityCity || query.pickupCity || query.city || "").trim(),
    category: query.category,
    type: query.type,
    seats: query.seats
  };
}

function searchCabsForCustomer(candidates, query = {}) {
  const request = customerSearchRequest(query);
  const matched = matchCabs(Array.isArray(candidates) ? candidates : [], request);
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;
  const total = matched.cabs.length;
  return {
    data: matched.cabs.slice(skip, skip + limit),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit))
    },
    source: matched.source,
    matchingMode: matched.matchingMode
  };
}

/** Explicit customer search (priorityCity), not admin catalog, not SEO city= filter. */
function wantsCityMatching(req) {
  const admin = String(req?.query?.admin || "");
  if (admin === "1" || admin === "true") return false;
  return Boolean(String(req?.query?.priorityCity || "").trim());
}

module.exports = {
  customerSearchRequest,
  searchCabsForCustomer,
  wantsCityMatching
};
