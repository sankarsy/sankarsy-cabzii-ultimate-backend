const { AuditLog } = require("../models/AuditLog");
const { vendorNameForUser } = require("../utils/vendorAccess");

async function logAudit({ req, action, entity, entityId = "", vendor = "", before = null, after = null, meta = {} }) {
  try {
    await AuditLog.create({
      actorUserId: req.user?._id || null,
      actorPhone: req.user?.mobileNumber || "",
      actorRole: req.user?.role || "",
      actorVendorName: vendorNameForUser(req.user) || "",
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
