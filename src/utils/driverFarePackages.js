"use strict";

const { buildDefaultFarePackages, num } = require("./cabFarePackages");

const DRIVER_PACKAGE_KEYS = ["local4hr", "local8hr", "localDay", "outstationOneWay", "outstationRoundTrip", "outstation12hr"];

function buildDefaultDriverFarePackages(driver = {}) {
  const hourly = num(driver?.pricing?.hourly);
  const day = num(driver?.pricing?.day);
  const extraHr = num(driver?.pricing?.extraHour) || hourly;
  const discount = num(driver.discountPercentage);
  const base = {
    hourlyRate: hourly,
    dayRate: day,
    price: day || hourly * 8 || 1000,
    extraHourRate: extraHr,
    discountPercentage: discount
  };
  const defaults = buildDefaultFarePackages(base);
  return {
    local4hr: defaults.local4hr,
    local8hr: defaults.local8hr,
    outstationOneWay: defaults.outstationOneWay,
    outstationRoundTrip: defaults.outstationRoundTrip
  };
}

function hasStoredDriverPackages(farePackages) {
  if (!farePackages || typeof farePackages !== "object") return false;
  const keys = [...DRIVER_PACKAGE_KEYS, "localDay", "outstation12hr"];
  return keys.some((key) => num(farePackages[key]?.price) > 0 || num(farePackages[key]?.originalPrice) > 0);
}

function mergeDriverFarePackages(existing, incoming) {
  const out = {};
  for (const key of DRIVER_PACKAGE_KEYS) {
    out[key] = { ...(existing?.[key] || {}), ...(incoming?.[key] || {}) };
  }
  if (incoming?.localDay && num(out.local8hr?.price) <= 0 && num(out.local8hr?.originalPrice) <= 0) {
    out.local8hr = { ...out.local8hr, ...incoming.localDay };
  }
  if (
    incoming?.outstation12hr &&
    num(out.outstationRoundTrip?.price) <= 0 &&
    num(out.outstationRoundTrip?.originalPrice) <= 0
  ) {
    out.outstationRoundTrip = { ...out.outstationRoundTrip, ...incoming.outstation12hr };
  }
  return out;
}

function mergeDriverFarePackageLabels(existing, incoming) {
  if (!incoming || typeof incoming !== "object") return existing || {};
  return { ...(existing || {}), ...incoming };
}

function resolveDriverFarePackages(value, existingPackages) {
  if (hasStoredDriverPackages(value.farePackages)) {
    return mergeDriverFarePackages(existingPackages || {}, value.farePackages);
  }
  if (hasStoredDriverPackages(existingPackages)) return existingPackages;
  return buildDefaultDriverFarePackages(value);
}

module.exports = {
  DRIVER_PACKAGE_KEYS,
  buildDefaultDriverFarePackages,
  mergeDriverFarePackages,
  mergeDriverFarePackageLabels,
  resolveDriverFarePackages,
  hasStoredDriverPackages
};
