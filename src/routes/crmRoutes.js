const express = require("express");
const ctrl = require("../controllers/crmController");
const { asyncHandler } = require("../utils/asyncHandler");
const { requireAuth, requireRole } = require("../middlewares/auth");

const router = express.Router();

router.get("/dashboard", requireAuth, requireRole("super_admin"), asyncHandler(ctrl.crmDashboard));
router.get("/", requireAuth, requireRole("super_admin"), asyncHandler(ctrl.listCrmLeads));
router.get("/:id", requireAuth, requireRole("super_admin"), asyncHandler(ctrl.getCrmLead));
router.post("/", requireAuth, requireRole("super_admin"), asyncHandler(ctrl.createCrmLead));
router.put("/:id", requireAuth, requireRole("super_admin"), asyncHandler(ctrl.updateCrmLead));
router.post("/:id/notes", requireAuth, requireRole("super_admin"), asyncHandler(ctrl.addCrmNote));
router.post("/:id/call-logs", requireAuth, requireRole("super_admin"), asyncHandler(ctrl.addCallLog));
router.post("/import-chat-leads", requireAuth, requireRole("super_admin"), asyncHandler(ctrl.importChatLeads));

module.exports = router;
