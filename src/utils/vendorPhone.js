"use strict";

const { HttpError } = require("./httpError");
const { normalizeMobileNumber } = require("./mobile");

function digitsPhone(raw) {
  return normalizeMobileNumber(raw) || "";
}

function contactPhoneDigits(raw) {
  const mobile = digitsPhone(raw);
  if (mobile) return mobile;
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length >= 10 && digits.length <= 15) return digits;
  throw new HttpError(400, "Enter a valid contact phone (10–15 digits).");
}

function vendorOwningAdminPhone(vendors, mobile, excludeId) {
  if (!mobile) return null;
  const skip = excludeId ? String(excludeId) : "";
  return (
    (vendors || []).find((v) => {
      if (skip && String(v._id) === skip) return false;
      return digitsPhone(v.adminPhone) === mobile;
    }) || null
  );
}

module.exports = {
  digitsPhone,
  contactPhoneDigits,
  vendorOwningAdminPhone
};
