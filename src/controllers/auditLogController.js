const { AuditLog } = require("../models/AuditLog");
const { vendorNameForUser } = require("../utils/vendorAccess");

async function listAuditLogs(req, res) {
  const vendorName = vendorNameForUser(req.user);
  const query =
    req.user.role === "vendor_admin"
      ? { $or: [{ actorPhone: req.user.mobileNumber }, ...(vendorName ? [{ vendor: vendorName }] : [])] }
      : {};
  const data = await AuditLog.find(query).sort({ createdAt: -1 }).limit(300);
  res.json({ success: true, data });
}

module.exports = { listAuditLogs };
