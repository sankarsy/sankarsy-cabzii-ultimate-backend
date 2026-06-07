const express = require("express");
const { analyticsOverview } = require("../controllers/analyticsController");
const { asyncHandler } = require("../utils/asyncHandler");
const { requireAuth } = require("../middlewares/auth");

const router = express.Router();

router.get("/overview", requireAuth, asyncHandler(analyticsOverview));

module.exports = router;
