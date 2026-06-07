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

/** JWT + DB role, with env super-admin phones always elevated */
function resolveEffectiveRole(mobileNumber, jwtRole, userRole) {
  const privileged = privilegedRoleForPhone(mobileNumber);
  if (privileged === "super_admin") return "super_admin";
  const base = jwtRole || userRole || "customer";
  if (base === "customer" && privileged) return privileged;
  return base;
}

function isAdminUser(req) {
  const role = req.user?.role;
  if (role === "super_admin" || role === "vendor_admin") return true;
  const privileged = privilegedRoleForPhone(req.user?.mobileNumber);
  return privileged === "super_admin" || privileged === "vendor_admin";
}

function isSuperAdminUser(req) {
  const role = req.user?.role;
  if (role === "super_admin") return true;
  return privilegedRoleForPhone(req.user?.mobileNumber) === "super_admin";
}

module.exports = {
  privilegedRoleForPhone,
  resolveEffectiveRole,
  isAdminUser,
  isSuperAdminUser
};
