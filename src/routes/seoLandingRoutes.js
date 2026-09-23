const express = require("express");
const {
  listSeoLandings,
  getSeoLanding,
  createSeoLanding,
  updateSeoLanding,
  deleteSeoLanding
} = require("../controllers/seoLandingController");
const { asyncHandler } = require("../utils/asyncHandler");
const { requireAuth, requireRole, optionalAuth } = require("../middlewares/auth");

const router = express.Router();

router.get("/", optionalAuth, asyncHandler(listSeoLandings));
router.get("/:id", optionalAuth, asyncHandler(getSeoLanding));
router.post("/", requireAuth, requireRole("super_admin"), asyncHandler(createSeoLanding));
router.put("/:id", requireAuth, requireRole("super_admin"), asyncHandler(updateSeoLanding));
router.delete("/:id", requireAuth, requireRole("super_admin"), asyncHandler(deleteSeoLanding));

module.exports = router;
