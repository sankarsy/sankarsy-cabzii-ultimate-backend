const { AuditLog } = require("../models/AuditLog");

async function listAuditLogs(req, res) {
  const query = req.user.role === "vendor_admin" ? { $or: [{ actorPhone: req.user.phone }, { vendor: req.user.vendorName }] } : {};
  const data = await AuditLog.find(query).sort({ createdAt: -1 }).limit(300);
  res.json({ success: true, data });
}

module.exports = { listAuditLogs };
