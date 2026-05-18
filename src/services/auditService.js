const { AuditLog } = require("../models/AuditLog");

async function logAudit({ req, action, entity, entityId = "", vendor = "", before = null, after = null, meta = {} }) {
  try {
    await AuditLog.create({
      actorUserId: req.user?._id || null,
      actorPhone: req.user?.phone || "",
      actorRole: req.user?.role || "",
      actorVendorName: req.user?.vendorName || "",
      action,
      entity,
      entityId: String(entityId || ""),
      vendor,
      before,
      after,
      meta
    });
  } catch (error) {
    console.error("Audit log failed:", error.message);
  }
}

module.exports = { logAudit };
