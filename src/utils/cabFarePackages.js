"use strict";

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function youPay(originalPrice, discountPct) {
  const d = Math.min(99, Math.max(0, num(discountPct)));
  const list = Math.max(0, num(originalPrice));
  return d > 0 ? Math.round(list * (1 - d / 100)) : list;
}

/** Build default local/outstation package fares from legacy cab rate fields. */
function buildDefaultFarePackages(cab = {}) {
  const hourly = num(cab.hourlyRate);
  const day = num(cab.dayRate);
  const price = num(cab.price);
  const extraHr = num(cab.extraHourRate);
  const discount = num(cab.discountPercentage);
  const extraKm = Math.max(12, Math.floor(price / 10) || 12);
  const extraHour = extraHr || Math.max(12, Math.floor(price / 12) || 12);

  const local4Original =
    hourly > 0 ? Math.round(hourly * 4) : day > 0 ? Math.round(day * 0.55) : price > 0 ? Math.round(price * 0.4) : 0;
  const local8Original = day > 0 ? day : hourly > 0 ? Math.round(hourly * 8) : price > 0 ? Math.round(price * 0.72) : 0;
  const outOneOriginal = price > 0 ? price : Math.max(local8Original, local4Original, 1);
  const outTwoOriginal = day > 0 ? Math.round(day * 1.85) : Math.round(outOneOriginal * 1.62);

  const mk = (originalPrice) => {
    const list = Math.max(num(originalPrice), 1);
    return {
      originalPrice: list,
      price: youPay(list, discount),
      discountPercentage: discount,
      extraKmRate: extraKm,
      extraHourRate: extraHour
    };
  };

  return {
    local4hr: mk(local4Original),
    local8hr: mk(local8Original),
    outstationOneWay: mk(outOneOriginal),
    outstationRoundTrip: mk(outTwoOriginal)
  };
}

const PACKAGE_KEYS = ["local4hr", "local8hr", "outstationOneWay", "outstationRoundTrip"];

function hasStoredPackages(farePackages) {
  if (!farePackages || typeof farePackages !== "object") return false;
  return PACKAGE_KEYS.some((key) => num(farePackages[key]?.price) > 0);
}

function mergeFarePackages(existing, incoming) {
  const out = {};
  for (const key of PACKAGE_KEYS) {
    out[key] = { ...(existing?.[key] || {}), ...(incoming?.[key] || {}) };
  }
  return out;
}

function resolveFarePackages(value, existingPackages) {
  if (hasStoredPackages(value.farePackages)) return value.farePackages;
  if (hasStoredPackages(existingPackages)) return existingPackages;
  return buildDefaultFarePackages(value);
}

module.exports = {
  buildDefaultFarePackages,
  youPay,
  num,
  PACKAGE_KEYS,
  hasStoredPackages,
  mergeFarePackages,
  resolveFarePackages
};
