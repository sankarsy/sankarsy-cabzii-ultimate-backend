const mongoose = require("mongoose");
const { env } = require("../config/env");
const { applyAuthenticatedVendorOwnership, resolveAuthenticatedVendor } = require("./vendorOwnership");

function vendorNameForUser(user) {
  if (user?.role !== "vendor_admin") return "";
  return user.vendorName || env.vendorAdminMap[user.mobileNumber] || "";
}

/** Vendors only see rows stamped with their authenticated phone. Unmatched history is hidden. Super admin is unscoped. */
function vendorOrScope(req) {
  if (req.user?.role !== "vendor_admin") return null;
  const mobileNumber = req.user.mobileNumber;
  if (!mobileNumber) {
    return { _id: new mongoose.Types.ObjectId("000000000000000000000000") };
  }
  return { vendorAdminPhone: mobileNumber };
}

function listFilterForVendor(req) {
  const scope = vendorOrScope(req);
  return scope || {};
}

function docMatchForVendor(req, id) {
  const scope = vendorOrScope(req);
  if (!scope) return { _id: id };
  return { _id: id, ...scope };
}

module.exports = {
  vendorOrScope,
  listFilterForVendor,
  docMatchForVendor,
  vendorNameForUser,
  applyAuthenticatedVendorOwnership,
  resolveAuthenticatedVendor
};
