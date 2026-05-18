/**
 * Vendor admins own rows either by vendorAdminPhone (assigned on create)
 * or by vendor name when vendorAdminPhone was never set (legacy / seed data).
 */

function vendorOrScope(req) {
  if (req.user?.role !== "vendor_admin") return null;
  const phone = req.user.phone;
  const vendorName = (req.user.vendorName || "").trim();
  const or = [{ vendorAdminPhone: phone }];
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

module.exports = { vendorOrScope, listFilterForVendor, docMatchForVendor };
