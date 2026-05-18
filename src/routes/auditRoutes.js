const express = require("express");
const { listAuditLogs } = require("../controllers/auditLogController");
const { asyncHandler } = require("../utils/asyncHandler");
const { requireAuth, requireRole } = require("../middlewares/auth");

const router = express.Router();

router.get("/", requireAuth, requireRole("super_admin", "vendor_admin"), asyncHandler(listAuditLogs));

module.exports = router;
