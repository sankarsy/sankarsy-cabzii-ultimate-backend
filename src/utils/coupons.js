"use strict";

const { num } = require("./bookingFare");

/** Existing checkout codes — validated only on the server. */
const COUPONS = {
  CABZII500: {
    code: "CABZII500",
    type: "flat",
    value: 500,
    services: ["cab"],
    tripTypes: ["outstation"],
    minFare: 1500,
    maxDiscount: 500,
    firstBookingOnly: true
  },
  FIRST100: {
    code: "FIRST100",
    type: "flat",
    value: 100,
    services: ["cab"],
    tripTypes: ["local", "hourly"],
    minFare: 0,
    maxDiscount: 100,
    firstBookingOnly: true
  },
  WEEKEND10: {
    code: "WEEKEND10",
    type: "percent",
    value: 10,
    services: ["cab"],
    tripTypes: ["airport"],
    minFare: 0,
    maxDiscount: 400,
    weekendOnly: true
  }
};

function normalizeCode(code) {
  return String(code || "")
    .trim()
    .toUpperCase();
}

function isWeekendDate(dateStr) {
  if (!dateStr) return false;
  const d = new Date(`${String(dateStr).slice(0, 10)}T12:00:00+05:30`);
  if (Number.isNaN(d.getTime())) return false;
  const day = d.getDay();
  return day === 0 || day === 6;
}

function tripTypeOf(input) {
  return String(input.tripType || input.serviceTripType || "")
    .toLowerCase()
    .trim();
}

/**
 * Invalid or ineligible coupons apply ₹0. Never use a client discount amount.
 */
function applyCoupon({ code, serviceType, tripType, date, baseFare, priorCompletedBookings = 0 }) {
  const normalized = normalizeCode(code);
  if (!normalized) {
    return { code: "", discount: 0, applied: false };
  }

  const rule = COUPONS[normalized];
  if (!rule) {
    return { code: "", discount: 0, applied: false };
  }

  const type = String(serviceType || "").toLowerCase();
  if (rule.services?.length && !rule.services.includes(type)) {
    return { code: "", discount: 0, applied: false };
  }

  const trip = tripTypeOf({ tripType });
  if (rule.tripTypes?.length && !rule.tripTypes.includes(trip)) {
    return { code: "", discount: 0, applied: false };
  }

  if (rule.weekendOnly && !isWeekendDate(date)) {
    return { code: "", discount: 0, applied: false };
  }

  if (rule.firstBookingOnly && num(priorCompletedBookings) > 0) {
    return { code: "", discount: 0, applied: false };
  }

  const fare = Math.max(0, num(baseFare));
  if (fare < num(rule.minFare)) {
    return { code: "", discount: 0, applied: false };
  }

  let discount = 0;
  if (rule.type === "percent") {
    discount = Math.round(fare * (num(rule.value) / 100));
  } else {
    discount = Math.round(num(rule.value));
  }

  const max = num(rule.maxDiscount, discount);
  discount = Math.min(discount, max, fare);

  return { code: rule.code, discount, applied: discount > 0 };
}

module.exports = { COUPONS, normalizeCode, applyCoupon, isWeekendDate };
