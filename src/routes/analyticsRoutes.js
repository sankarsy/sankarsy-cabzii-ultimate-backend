const express = require("express");
const { getOverview } = require("../controllers/analyticsController");
const { asyncHandler } = require("../utils/asyncHandler");
const { requireAuth, requireRole } = require("../middlewares/auth");

const router = express.Router();

router.get("/overview", requireAuth, requireRole("super_admin"), asyncHandler(getOverview));

module.exports = router;
