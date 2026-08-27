const express = require("express");
const { analyticsOverview } = require("../controllers/analyticsController");
const { seoRevenueOverview } = require("../controllers/seoRevenueController");
const { asyncHandler } = require("../utils/asyncHandler");
const { requireAuth } = require("../middlewares/auth");

const router = express.Router();

router.get("/overview", requireAuth, asyncHandler(analyticsOverview));
router.get("/seo-revenue", requireAuth, asyncHandler(seoRevenueOverview));

module.exports = router;
