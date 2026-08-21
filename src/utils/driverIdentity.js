"use strict";

const { Driver } = require("../models/Driver");
const { HttpError } = require("./httpError");
const { normalizeMobileNumber } = require("./mobile");
const { privilegedRoleForPhone } = require("./adminAccess");

function normalizeDriverPhone(raw) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return "";
  const phone = normalizeMobileNumber(trimmed);
  if (!phone) throw new HttpError(400, "Enter a valid 10-digit driver mobile number.");
  return phone;
}

function assertDriverPhoneNotVendorOrAdmin(phone, vendorAdminPhone) {
  if (!phone) return;
  if (privilegedRoleForPhone(phone)) {
    throw new HttpError(400, "Driver phone cannot be a partner or admin number.");
  }
  if (vendorAdminPhone && phone === String(vendorAdminPhone)) {
    throw new HttpError(400, "Driver phone must belong to the driver, not the vendor.");
  }
}

async function assertUniqueDriverPhone(phone, excludeId) {
  if (!phone) return;
  const query = { phone, isDeleted: { $ne: true } };
  if (excludeId) query._id = { $ne: excludeId };
  const existing = await Driver.findOne(query).select("_id").lean();
  if (existing) throw new HttpError(409, "This driver mobile number is already in use.");
}

async function findActiveDriverByPhone(phone) {
  if (!phone) return null;
  return Driver.findOne({
    phone,
    isDeleted: { $ne: true }
  }).lean();
}

function assertDriverCanLogin(driver) {
  if (!driver) {
    throw new HttpError(403, "This mobile is not registered as a driver.");
  }
  if (driver.status && driver.status !== "active") {
    throw new HttpError(403, "This driver account is inactive.");
  }
}

function assertNotPrivilegedDriverLogin(mobileNumber) {
  const privileged = privilegedRoleForPhone(mobileNumber);
  if (privileged === "vendor_admin" || privileged === "super_admin") {
    throw new HttpError(403, "This mobile is registered as a partner or admin. Use partner login.");
  }
}

function driverSessionUser(user, driver) {
  return {
    _id: user._id,
    mobileNumber: user.mobileNumber || driver.phone,
    role: "driver",
    driverId: driver._id,
    name: driver.name || user.name || ""
  };
}

module.exports = {
  normalizeDriverPhone,
  assertDriverPhoneNotVendorOrAdmin,
  assertUniqueDriverPhone,
  findActiveDriverByPhone,
  assertDriverCanLogin,
  assertNotPrivilegedDriverLogin,
  driverSessionUser
};
