"use strict";

const { buildDefaultFarePackages, PACKAGE_KEYS } = require("./cabFarePackages");

const TYPE_TO_LEGACY = {
  local_4hr: "local4hr",
  local_8hr: "local8hr",
  one_way: "outstationOneWay",
  round_trip: "outstationRoundTrip",
  airport_pickup: "local4hr",
  airport_drop: "local4hr",
  hourly: "local4hr",
  wedding: "local8hr",
  corporate: "local8hr",
  custom: null
};

const DEFAULT_LABELS = {
  local4hr: "Local — 4 Hrs / 40 Km",
  local8hr: "Local — 8 Hrs / 80 Km",
  outstationOneWay: "Outstation — One Way",
  outstationRoundTrip: "Outstation — Round Trip"
};

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizePackageRow(row = {}, index = 0) {
  const originalPrice = Math.max(0, num(row.originalPrice));
  const discount = Math.min(100, Math.max(0, num(row.discountPercentage)));
  let price = Math.max(0, num(row.price));
  if (price <= 0 && originalPrice > 0) {
    price = discount > 0 ? Math.round(originalPrice * (1 - discount / 100)) : originalPrice;
  }
  if (originalPrice > 0 && price > originalPrice) {
    throw new Error(`Package "${row.packageName || row.packageType}" price cannot exceed original price`);
  }
  return {
    packageType: String(row.packageType || "custom").trim() || "custom",
    packageName: String(row.packageName || "").trim(),
    includedHours: Math.max(0, num(row.includedHours)),
    includedKm: Math.max(0, num(row.includedKm)),
    originalPrice,
    price,
    discountPercentage: discount,
    extraKmRate: Math.max(0, num(row.extraKmRate)),
    extraHourRate: Math.max(0, num(row.extraHourRate)),
    sortOrder: Number.isFinite(Number(row.sortOrder)) ? Number(row.sortOrder) : index,
    active: row.active !== false,
    _id: row._id
  };
}

function packagesFromFarePackages(farePackages = {}, labels = {}) {
  const rows = [];
  const mapping = [
    { type: "local_4hr", key: "local4hr", hours: 4, km: 40 },
    { type: "local_8hr", key: "local8hr", hours: 8, km: 80 },
    { type: "one_way", key: "outstationOneWay", hours: 0, km: 0 },
    { type: "round_trip", key: "outstationRoundTrip", hours: 0, km: 0 }
  ];
  mapping.forEach((m, i) => {
    const pkg = farePackages[m.key];
    if (!pkg || num(pkg.price) <= 0) return;
    rows.push(
      normalizePackageRow(
        {
          packageType: m.type,
          packageName: labels[m.key] || DEFAULT_LABELS[m.key],
          includedHours: m.hours,
          includedKm: m.km,
          ...pkg
        },
        i
      )
    );
  });
  return rows;
}

function farePackagesFromPackages(packages = []) {
  const out = {};
  const labels = {};
  const sorted = [...packages].filter((p) => p && p.active !== false).sort((a, b) => num(a.sortOrder) - num(b.sortOrder));

  for (const row of sorted) {
    const legacyKey = TYPE_TO_LEGACY[row.packageType];
    if (!legacyKey) continue;
    const fare = {
      originalPrice: num(row.originalPrice),
      price: num(row.price),
      discountPercentage: num(row.discountPercentage),
      extraKmRate: num(row.extraKmRate),
      extraHourRate: num(row.extraHourRate)
    };
    if (num(fare.price) <= 0) continue;
    if (!out[legacyKey] || num(fare.price) < num(out[legacyKey].price)) {
      out[legacyKey] = fare;
      if (row.packageName) labels[legacyKey] = row.packageName;
    }
  }
  return { farePackages: out, farePackageLabels: labels };
}

function resolveVehiclePackages(doc = {}) {
  if (Array.isArray(doc.packages) && doc.packages.length > 0) {
    return doc.packages.map(normalizePackageRow);
  }
  return packagesFromFarePackages(doc.farePackages, doc.farePackageLabels);
}

function syncVehiclePricing(doc = {}) {
  const packages = resolveVehiclePackages(doc).map((p, i) => normalizePackageRow(p, i));
  const synced = farePackagesFromPackages(packages);
  let farePackages = synced.farePackages;
  if (!Object.keys(farePackages).length) {
    farePackages = buildDefaultFarePackages(doc);
  }
  const startingPrice =
    num(doc.startingPrice) > 0
      ? num(doc.startingPrice)
      : Math.min(...Object.values(farePackages).map((p) => num(p.price)).filter((n) => n > 0), num(doc.price) || Infinity);

  const pricePerKm =
    num(doc.pricePerKm) > 0
      ? num(doc.pricePerKm)
      : num(farePackages.outstationOneWay?.extraKmRate) ||
        num(packages.find((p) => p.packageType === "one_way")?.extraKmRate) ||
        0;

  return {
    packages,
    farePackages,
    farePackageLabels: { ...(doc.farePackageLabels || {}), ...synced.farePackageLabels },
    startingPrice: Number.isFinite(startingPrice) ? startingPrice : num(doc.price),
    pricePerKm
  };
}

function lowestPackagePrice(packages = []) {
  const prices = packages.map((p) => num(p.price)).filter((n) => n > 0);
  return prices.length ? Math.min(...prices) : 0;
}

module.exports = {
  TYPE_TO_LEGACY,
  DEFAULT_LABELS,
  normalizePackageRow,
  packagesFromFarePackages,
  farePackagesFromPackages,
  resolveVehiclePackages,
  syncVehiclePricing,
  lowestPackagePrice,
  PACKAGE_KEYS
};
