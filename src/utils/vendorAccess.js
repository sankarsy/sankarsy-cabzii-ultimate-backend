const { env } = require("../config/env");

function vendorNameForUser(user) {
  if (user?.role !== "vendor_admin") return "";
  return env.vendorAdminMap[user.mobileNumber] || "";
}

function vendorOrScope(req) {
  if (req.user?.role !== "vendor_admin") return null;
  const mobileNumber = req.user.mobileNumber;
  const vendorName = vendorNameForUser(req.user);
  const or = [{ vendorAdminPhone: mobileNumber }];
  if (vendorName) {
    or.push({
      vendor: vendorName,
      $or: [{ vendorAdminPhone: "" }, { vendorAdminPhone: { $exists: false } }]
    });
  }
  return { $or: or };
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

module.exports = { vendorOrScope, listFilterForVendor, docMatchForVendor, vendorNameForUser };
