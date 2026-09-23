"use strict";

const UNTRUSTED_PRICE_KEYS = [
  "amount",
  "totalFare",
  "discount",
  "couponDiscount",
  "tax",
  "fees",
  "finalAmount",
  "advanceAmount",
  "balanceAmount",
  "payMode",
  "baseFare",
  "price",
  "offerPrice",
  "pricingSource",
  "vendor",
  "vendorAdminPhone",
  "startAt",
  "endAt",
  "expiresAt",
  "assignedVehicleId",
  "assignedDriverId",
  "tripStartedAt",
  "tripFinishedAt",
  "finishedAt",
  "latestLocation"
];

function stripUntrustedPricing(obj = {}) {
  const next = { ...obj };
  for (const key of UNTRUSTED_PRICE_KEYS) delete next[key];
  return next;
}

function applyFareSnapshot(payload, snapshot) {
  return {
    ...payload,
    amount: snapshot.finalAmount,
    baseFare: snapshot.baseFare,
    discount: snapshot.discount,
    tax: snapshot.tax,
    fees: snapshot.fees,
    finalAmount: snapshot.finalAmount,
    advanceAmount: snapshot.advanceAmount ?? snapshot.finalAmount,
    balanceAmount: snapshot.balanceAmount ?? 0,
    payMode: snapshot.payMode || "full",
    pricingSource: snapshot.pricingSource,
    couponCode: snapshot.couponCode,
    vendor: snapshot.vendor || "",
    vendorAdminPhone: snapshot.vendorAdminPhone || "",
    distanceKm: snapshot.distanceKm ?? null
  };
}

module.exports = {
  UNTRUSTED_PRICE_KEYS,
  stripUntrustedPricing,
  applyFareSnapshot
};
