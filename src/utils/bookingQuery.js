"use strict";

const { normalizeMobileNumber } = require("./mobile");

/** Values that may appear in legacy booking.phone fields. */
function phoneLookupValues(mobile) {
  const normalized = normalizeMobileNumber(mobile);
  if (!normalized) return [];

  const spaced = `${normalized.slice(0, 5)} ${normalized.slice(5)}`;
  return [
    normalized,
    `0${normalized}`,
    `91${normalized}`,
    `+91${normalized}`,
    `+91 ${spaced}`,
    `+91-${normalized.slice(0, 5)}-${normalized.slice(5)}`
  ];
}

function buildCustomerBookingQuery(user) {
  const clauses = [];

  if (user?._id) {
    clauses.push({ user: user._id });
  }

  const phones = phoneLookupValues(user?.mobileNumber);
  if (phones.length) {
    clauses.push({ phone: { $in: phones } });
  }

  return clauses.length ? { $or: clauses } : {};
}

function bookingOwnedByUser(booking, user) {
  if (!booking || !user) return false;

  const userId = String(user._id || "");
  const bookingUserId = String(booking.user || "");
  if (userId && bookingUserId && userId === bookingUserId) return true;

  const bookingPhone = normalizeMobileNumber(booking.phone);
  const userPhone = normalizeMobileNumber(user.mobileNumber);
  return Boolean(bookingPhone && userPhone && bookingPhone === userPhone);
}

module.exports = {
  phoneLookupValues,
  buildCustomerBookingQuery,
  bookingOwnedByUser
};
