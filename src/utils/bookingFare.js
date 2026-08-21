"use strict";

const { pickLocalPackageByHours } = require("./vehiclePackages");

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function sellingPrice(pkg, fallback = 0) {
  if (num(pkg?.price) > 0) return num(pkg.price);
  if (num(pkg?.originalPrice) > 0) return num(pkg.originalPrice);
  return Math.max(0, num(fallback));
}

function cabPackageIdFromTrip(trip = {}, catalog) {
  if (trip.packageId) return String(trip.packageId);
  const tripType = String(trip.tripType || trip.serviceTripType || "").toLowerCase();
  if (tripType === "outstation") return trip.roundTrip ? "outstation_twoway" : "outstation_oneway";
  if (tripType === "hourly" || tripType === "local" || tripType === "airport") {
    const picked = pickLocalPackageByHours(catalog?.packages, trip.packageHours);
    if (picked?.packageType) {
      if (picked.packageType === "local_8hr") return "local_1day";
      return picked.packageType;
    }
    const h = num(trip.packageHours, 8);
    if (h > 12) return "local_15hr";
    if (h > 7) return h > 8 ? "local_10hr" : "local_1day";
    if (h <= 4) return "local_4hr";
    if (h <= 5) return "local_5hr";
    return "local_1day";
  }
  return "local_4hr";
}

function extraKmFrom(pkg, catalog) {
  if (num(pkg?.extraKmRate) > 0) return num(pkg.extraKmRate);
  if (num(pkg?.extraKm) > 0) return num(pkg.extraKm);
  const base = num(catalog?.price);
  if (base > 0 && base <= 30) return base;
  return Math.max(12, Math.floor(base / 100) || 14);
}

function buildLegacyCab(cab = {}) {
  const hourly = num(cab.hourlyRate);
  const day = num(cab.dayRate);
  const price = num(cab.price);
  const local4 =
    hourly > 0 ? Math.round(hourly * 4) : day > 0 ? Math.round(day * 0.55) : price > 0 ? Math.round(price * 0.4) : 0;
  const local8 = day > 0 ? day : hourly > 0 ? Math.round(hourly * 8) : price > 0 ? Math.round(price * 0.72) : 0;
  const outOne = price > 0 ? Math.round(price) : Math.max(local8, local4, 0);
  const outTwo = day > 0 ? Math.round(day * 1.85) : Math.round(outOne * 1.62);
  return { local4, local8, outOne, outTwo };
}

const SLAB_META = [
  { id: "local_4hr", group: "local", key: "local4hr", legacy: "local4" },
  { id: "local_1day", group: "local", key: "local8hr", legacy: "local8" },
  { id: "outstation_oneway", group: "outstation", key: "outstationOneWay", legacy: "outOne" },
  { id: "outstation_twoway", group: "outstation", key: "outstationRoundTrip", legacy: "outTwo" }
];

function slabFromStored(stored, catalog, fallback) {
  const price = sellingPrice(stored, fallback);
  return {
    price,
    extraKm: extraKmFrom(stored, catalog)
  };
}

function buildCabSlabs(cab) {
  const packages = cab?.farePackages || {};
  const legacy = buildLegacyCab(cab);
  const dynamic = Array.isArray(cab?.packages)
    ? cab.packages.filter((p) => p && p.active !== false && num(p.price) > 0)
    : [];
  const TYPE_TO_ID = {
    local_4hr: "local_4hr",
    local_5hr: "local_5hr",
    local_8hr: "local_1day",
    local_10hr: "local_10hr",
    local_15hr: "local_15hr",
    one_way: "outstation_oneway",
    round_trip: "outstation_twoway"
  };

  if (dynamic.length) {
    return dynamic.map((row, index) => {
      const id = TYPE_TO_ID[row.packageType] || row.packageType || `pkg_${index}`;
      const isLocal =
        String(row.packageType || "").includes("local") ||
        row.packageType === "hourly" ||
        row.packageType === "airport_pickup" ||
        row.packageType === "airport_drop";
      return {
        id,
        price: sellingPrice(row, 0),
        extraKm: extraKmFrom(row, cab),
        extraHr: num(row.extraHourRate),
        includedKm: num(row.includedKm),
        includedHours: num(row.includedHours),
        group: isLocal ? "local" : "outstation"
      };
    });
  }

  return SLAB_META.map((meta) => ({
    id: meta.id,
    group: meta.group,
    ...slabFromStored(packages[meta.key], cab, legacy[meta.legacy])
  }));
}

function pickCabSlab(slabs, trip, catalog) {
  if (!slabs?.length) return null;
  const packageId = cabPackageIdFromTrip(trip, catalog);
  const byId = slabs.find((s) => s.id === packageId);
  if (byId) return byId;
  const tripType = String(trip.tripType || trip.serviceTripType || "").toLowerCase();
  if (tripType === "outstation") {
    return trip.roundTrip
      ? slabs.find((s) => s.id === "outstation_twoway") || slabs.find((s) => s.group === "outstation") || slabs[0]
      : slabs.find((s) => s.id === "outstation_oneway") || slabs.find((s) => s.group === "outstation") || slabs[0];
  }
  const local = slabs.filter((s) => s.group === "local" && num(s.price) > 0);
  const byHours = (h) => local.find((s) => num(s.includedHours) === h);
  const h = num(trip.packageHours, 8);
  if (h > 12 && byHours(15)) return byHours(15);
  if (h > 7 && byHours(10)) return byHours(10);
  if (h > 4 && byHours(8)) return byHours(8);
  if (h <= 4 && byHours(4)) return byHours(4);
  if (h <= 5 && byHours(5)) return byHours(5);
  return byHours(8) || slabs.find((s) => s.id === "local_4hr") || local[0] || slabs[0];
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function trustedDistanceKm(input) {
  const lat1 = num(input.pickupLat, NaN);
  const lng1 = num(input.pickupLng, NaN);
  const lat2 = num(input.dropLat, NaN);
  const lng2 = num(input.dropLng, NaN);
  // Future pricing-integrity (not this wave): extra-km is skipped when coordinates
  // are missing/invalid. Client distanceKm is not trusted. Do not geocode here.
  if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) return 0;
  return Math.max(1, Math.ceil(haversineKm(lat1, lng1, lat2, lng2) * 1.25));
}

function resolveVehicleFare(catalog, trip, kind) {
  const slabs = kind === "driver" ? buildDriverSlabs(catalog) : buildCabSlabs(catalog);
  const slab = pickCabSlab(slabs, trip, catalog) || { price: num(catalog?.price), extraKm: extraKmFrom({}, catalog) };
  const packageTotal =
    num(slab.price) > 0
      ? num(slab.price)
      : kind === "driver"
        ? num(catalog?.pricing?.day) || num(catalog?.price)
        : num(catalog?.price);

  const tripType = String(trip.tripType || trip.serviceTripType || "").toLowerCase();
  const distanceKm = trustedDistanceKm(trip);
  const useDistance = distanceKm > 0 && (tripType === "outstation" || (trip.pickup && trip.drop));
  const batta = tripType === "outstation" ? num(catalog?.driverAllowance) : 0;

  if (!useDistance) {
    return {
      baseFare: Math.max(0, Math.round(packageTotal + batta)),
      pricingSource: slab.id ? `package:${slab.id}` : "package",
      distanceKm: 0
    };
  }

  const perKm = extraKmFrom(slab, catalog);
  const multiplier = trip.roundTrip ? 2 : 1;
  const billedKm = Math.round(distanceKm * multiplier);
  const includedKm = num(slab.includedKm);
  const extraKmCharge =
    includedKm > 0 ? Math.max(0, billedKm - includedKm) * perKm : Math.max(0, billedKm * perKm);
  const distanceFare = includedKm > 0 ? Math.round(packageTotal + extraKmCharge) : Math.max(Math.round(packageTotal), Math.round(extraKmCharge));
  const baseFare = Math.max(0, Math.round(distanceFare + batta));
  return {
    baseFare,
    pricingSource: `distance:${perKm}/km`,
    distanceKm
  };
}

function buildDriverSlabs(driver) {
  const packages = driver?.farePackages || {};
  const hourly = num(driver?.pricing?.hourly);
  const day = num(driver?.pricing?.day);
  const fakeCab = {
    hourlyRate: hourly,
    dayRate: day,
    price: day || hourly * 8 || 0,
    farePackages: {
      local4hr: packages.local4hr,
      local8hr: packages.local8hr || packages.localDay,
      outstationOneWay: packages.outstationOneWay,
      outstationRoundTrip: packages.outstationRoundTrip || packages.outstation12hr
    }
  };
  return buildCabSlabs(fakeCab);
}

function seatPriceKey(seatId) {
  const id = String(seatId || "");
  if (/^U/i.test(id)) return "upperBerth";
  if (/^L/i.test(id)) return "lowerBerth";
  if (/^S/i.test(id)) return "seater";
  return "seater";
}

function resolveBusFare(trip, seats, tripGuarantee) {
  const fares = {
    seater: num(trip.seaterPrice, 599),
    sleeper: num(trip.sleeperPrice, 899),
    lowerBerth: num(trip.lowerBerthPrice, 999),
    upperBerth: num(trip.upperBerthPrice, 799)
  };
  const layout = Array.isArray(trip.seatLayout) ? trip.seatLayout : [];
  let baseFare = 0;
  for (const seatId of seats) {
    const laid = layout.find((s) => String(s.id) === String(seatId));
    const key = laid?.priceKey || seatPriceKey(seatId);
    baseFare += num(fares[key] ?? fares.seater);
  }
  const fees = tripGuarantee ? num(trip.tripGuaranteePrice, 24) * Math.max(seats.length, 1) : 0;
  return {
    baseFare: Math.round(baseFare),
    fees: Math.round(fees),
    pricingSource: "bus-seats"
  };
}

function resolveTourFare(pkg, input) {
  const price = sellingPrice(pkg, 0);
  const cabType = String(input.cabType || "").trim();
  const types = Array.isArray(pkg.cabTypes) ? pkg.cabTypes : [];
  const match = cabType ? types.find((t) => String(t.id) === cabType) : null;
  const multiplier = num(match?.multiplier, 1) > 0 ? num(match?.multiplier, 1) : 1;
  return {
    baseFare: Math.round(price * multiplier),
    pricingSource: match ? `tour:${cabType}` : "tour-package"
  };
}

/**
 * @returns {{ baseFare: number, discount: number, tax: number, fees: number, finalAmount: number, pricingSource: string, couponCode: string, distanceKm: number|null, vendor: string, vendorAdminPhone: string }}
 */
function composeFare({ baseFare, fees = 0, couponResult, pricingSource, distanceKm = null, vendor = "", vendorAdminPhone = "" }) {
  const tax = 0;
  const discount = Math.max(0, num(couponResult?.discount));
  const finalAmount = Math.max(0, Math.round(num(baseFare) + num(fees) + tax - discount));
  return {
    baseFare: Math.round(num(baseFare)),
    discount,
    tax,
    fees: Math.round(num(fees)),
    finalAmount,
    amount: finalAmount,
    pricingSource: pricingSource || "catalog",
    couponCode: couponResult?.code || "",
    distanceKm,
    vendor: vendor || "",
    vendorAdminPhone: vendorAdminPhone || ""
  };
}

module.exports = {
  num,
  sellingPrice,
  cabPackageIdFromTrip,
  extraKmFrom,
  buildCabSlabs,
  pickCabSlab,
  haversineKm,
  trustedDistanceKm,
  resolveVehicleFare,
  resolveBusFare,
  resolveTourFare,
  composeFare,
  seatPriceKey
};
