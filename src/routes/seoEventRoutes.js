"use strict";

const express = require("express");
const { asyncHandler } = require("../utils/asyncHandler");
const { requireAuth, requireRole } = require("../middlewares/auth");
const ctrl = require("../controllers/seoRevenueController");

const router = express.Router();

router.post("/", asyncHandler(ctrl.ingestSeoEvent));

router.get("/insights", requireAuth, requireRole("super_admin"), asyncHandler(ctrl.listInsights));
router.post("/insights", requireAuth, requireRole("super_admin"), asyncHandler(ctrl.createInsight));
router.put("/insights/:id", requireAuth, requireRole("super_admin"), asyncHandler(ctrl.updateInsight));
router.delete("/insights/:id", requireAuth, requireRole("super_admin"), asyncHandler(ctrl.deleteInsight));

module.exports = router;
