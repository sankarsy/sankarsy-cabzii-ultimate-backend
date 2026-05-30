"use strict";

const { buildDefaultFarePackages, mergeFarePackages, hasStoredPackages, num } = require("./cabFarePackages");

const DRIVER_PACKAGE_KEYS = ["local4hr", "localDay", "outstation12hr", "outstationOneWay"];

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
    localDay: defaults.local8hr,
    outstation12hr: defaults.local8hr,
    outstationOneWay: defaults.outstationOneWay
  };
}

function hasStoredDriverPackages(farePackages) {
  if (!farePackages || typeof farePackages !== "object") return false;
  return DRIVER_PACKAGE_KEYS.some((key) => num(farePackages[key]?.price) > 0);
}

function mergeDriverFarePackages(existing, incoming) {
  const out = {};
  for (const key of DRIVER_PACKAGE_KEYS) {
    out[key] = { ...(existing?.[key] || {}), ...(incoming?.[key] || {}) };
  }
  return out;
}

function mergeDriverFarePackageLabels(existing, incoming) {
  if (!incoming || typeof incoming !== "object") return existing || {};
  return { ...(existing || {}), ...incoming };
}

function resolveDriverFarePackages(value, existingPackages) {
  if (hasStoredDriverPackages(value.farePackages)) return value.farePackages;
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
