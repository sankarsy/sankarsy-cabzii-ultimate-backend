"use strict";

const { isGenericVendorName } = require("../utils/vendorOwnership");
const { isPublicVehicleStatus } = require("../utils/vehicleInventory");
const { normalizeMobileNumber } = require("../utils/mobile");

/**
 * Location / service-area priority matching.
 * Not GPS nearest-vendor ranking — Vendor and Cab have no coordinates.
 */

function pickupNeedle(request = {}) {
  return String(request.pickupCity || request.city || request.pickup || "").trim();
}

function token(value) {
  return String(value || "").trim().toLowerCase();
}

function vendorPhoneKey(cab) {
  const raw = String(cab?.vendorAdminPhone || "").trim();
  if (!raw) return "";
  return normalizeMobileNumber(raw) || raw;
}

/** Vendor-owned inventory: stamped vendorAdminPhone. Empty phone is not a vendor fleet. */
function isVendorOwnedCab(cab) {
  return Boolean(vendorPhoneKey(cab));
}

/**
 * Cabzii fallback heuristic (no ownedByCabzii field): empty vendorAdminPhone.
 * Generic "Cabzii" / "Cabzii Partner" names without a phone are included.
 * A stamped vendorAdminPhone is vendor-owned even if the display name is generic.
 */
function isCabziiFallbackCab(cab) {
  if (isVendorOwnedCab(cab)) return false;
  if (isGenericVendorName(cab?.vendor)) return true;
  return !vendorPhoneKey(cab);
}

function cabLocationTokens(cab) {
  const values = [cab?.city, cab?.location];
  if (Array.isArray(cab?.serviceAreas)) values.push(...cab.serviceAreas);
  if (Array.isArray(cab?.pickupLocations)) values.push(...cab.pickupLocations);
  return values.map(token).filter(Boolean);
}

function pickupMatchesCab(cab, pickup) {
  const needle = token(pickup);
  if (!needle) return true;
  return cabLocationTokens(cab).some((t) => t === needle || t.includes(needle) || needle.includes(t));
}

function locationScore(cab, pickup) {
  const needle = token(pickup);
  if (!needle) return 0;
  if (!pickupMatchesCab(cab, pickup)) return -1;
  const city = token(cab?.city);
  if (city && (city === needle || city.includes(needle) || needle.includes(city))) return 3;
  const areas = Array.isArray(cab?.serviceAreas) ? cab.serviceAreas.map(token) : [];
  if (areas.some((t) => t === needle || t.includes(needle) || needle.includes(t))) return 2;
  return 1;
}

function categoryMatches(cab, request = {}) {
  const wanted = token(request.category || request.type);
  if (!wanted) return true;
  const category = token(cab?.category);
  const type = token(cab?.type);
  return category === wanted || type === wanted;
}

function seatsMatch(cab, request = {}) {
  const seats = Number(request.seats);
  if (!Number.isFinite(seats) || seats <= 0) return true;
  return Number(cab?.seats) >= seats;
}

function isMatchingAvailable(cab) {
  const avail = String(cab?.availabilityStatus || "available").trim().toLowerCase();
  return !avail || avail === "available";
}

function isEligibleCab(cab, request = {}) {
  if (!cab || cab.isDeleted === true) return false;
  if (!isPublicVehicleStatus(cab.status)) return false;
  if (!isMatchingAvailable(cab)) return false;
  if (!categoryMatches(cab, request)) return false;
  if (!seatsMatch(cab, request)) return false;
  return true;
}

function groupByVendorPhone(cabs) {
  const groups = new Map();
  for (const cab of cabs) {
    const key = vendorPhoneKey(cab);
    if (!key) continue;
    const list = groups.get(key) || [];
    list.push(cab);
    groups.set(key, list);
  }
  return groups;
}

function pickPreferredVendorGroup(groups, pickup) {
  let bestKey = "";
  let bestScore = -1;
  let bestCount = -1;
  const keys = [...groups.keys()].sort();
  for (const key of keys) {
    const list = groups.get(key);
    const score = Math.max(...list.map((cab) => locationScore(cab, pickup)));
    if (score > bestScore || (score === bestScore && list.length > bestCount)) {
      bestScore = score;
      bestCount = list.length;
      bestKey = key;
    }
  }
  return bestKey;
}

/**
 * Rank already-loaded Cab documents. Never reads request.vendorId.
 * matchingMode is always location_service_area (not GPS distance).
 */
function matchCabs(cabs = [], request = {}) {
  const pickup = pickupNeedle(request);
  const eligible = (Array.isArray(cabs) ? cabs : []).filter((cab) => isEligibleCab(cab, request));
  const located = eligible.filter((cab) => pickupMatchesCab(cab, pickup));

  const vendorLocated = located.filter(isVendorOwnedCab);
  if (vendorLocated.length) {
    const groups = groupByVendorPhone(vendorLocated);
    const vendorAdminPhone = pickPreferredVendorGroup(groups, pickup);
    return {
      source: "vendor",
      matchingMode: "location_service_area",
      vendorAdminPhone,
      cabs: groups.get(vendorAdminPhone) || []
    };
  }

  const fallbackLocated = located.filter(isCabziiFallbackCab);
  const fallbackAll = eligible.filter(isCabziiFallbackCab);
  return {
    source: "cabzii_fallback",
    matchingMode: "location_service_area",
    vendorAdminPhone: "",
    cabs: fallbackLocated.length ? fallbackLocated : fallbackAll
  };
}

module.exports = {
  matchCabs,
  isEligibleCab,
  isVendorOwnedCab,
  isCabziiFallbackCab,
  pickupMatchesCab,
  pickupNeedle
};
