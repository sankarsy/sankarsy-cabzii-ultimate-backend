"use strict";

const { env } = require("../config/env");
const { normalizeMobileNumber } = require("./mobile");

function privilegedRoleForPhone(mobileNumber) {
  const mobile = normalizeMobileNumber(mobileNumber);
  if (!mobile) return null;

  if (env.superAdminPhones.includes(mobile)) return "super_admin";

  const adminPhone = normalizeMobileNumber(env.adminPhone);
  const adminLoginPhone = normalizeMobileNumber(env.adminLoginPhone);
  if ((adminPhone && mobile === adminPhone) || (adminLoginPhone && mobile === adminLoginPhone)) {
    return "super_admin";
  }

  if (env.vendorAdminMap[mobile]) return "vendor_admin";
  return null;
}

/**
 * JWT session role wins for drivers so a driver token never elevates to vendor/admin,
 * even if the phone later appears in a privileged env map. A customer JWT is never
 * treated as a driver just because User.role is driver.
 */
function resolveEffectiveRole(mobileNumber, jwtRole, userRole) {
  if (jwtRole === "driver") return "driver";
  const privileged = privilegedRoleForPhone(mobileNumber);
  if (privileged === "super_admin") return "super_admin";
  if (userRole === "super_admin" || userRole === "vendor_admin") return userRole;
  const base = jwtRole || userRole || "customer";
  if (base === "driver") return "customer";
  if (base === "customer" && privileged) return privileged;
  return base;
}

function isDriverUser(req) {
  return req.user?.role === "driver";
}

function isAdminUser(req) {
  if (req.user?.role === "driver") return false;
  const role = req.user?.role;
  if (role === "super_admin" || role === "vendor_admin") return true;
  const privileged = privilegedRoleForPhone(req.user?.mobileNumber);
  return privileged === "super_admin" || privileged === "vendor_admin";
}

function isSuperAdminUser(req) {
  if (req.user?.role === "driver") return false;
  const role = req.user?.role;
  if (role === "super_admin") return true;
  return privilegedRoleForPhone(req.user?.mobileNumber) === "super_admin";
}

module.exports = {
  privilegedRoleForPhone,
  resolveEffectiveRole,
  isAdminUser,
  isSuperAdminUser,
  isDriverUser
};
