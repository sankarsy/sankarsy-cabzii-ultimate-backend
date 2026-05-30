const express = require("express");
const { getPublicSettings, updateSettings } = require("../controllers/siteSettingsController");
const { asyncHandler } = require("../utils/asyncHandler");
const { requireAuth, requireRole } = require("../middlewares/auth");

const router = express.Router();

router.get("/", asyncHandler(getPublicSettings));
router.put("/", requireAuth, requireRole("super_admin"), asyncHandler(updateSettings));

module.exports = router;
