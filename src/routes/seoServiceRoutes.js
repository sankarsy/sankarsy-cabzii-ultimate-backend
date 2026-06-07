const express = require("express");
const {
  listSeoServices,
  getSeoServiceBySlug,
  createSeoService,
  updateSeoService,
  deleteSeoService
} = require("../controllers/seoServiceController");
const { asyncHandler } = require("../utils/asyncHandler");
const { requireAuth, requireRole, optionalAuth } = require("../middlewares/auth");

const router = express.Router();

router.get("/", optionalAuth, asyncHandler(listSeoServices));
router.get("/:slug", optionalAuth, asyncHandler(getSeoServiceBySlug));
router.post("/", requireAuth, requireRole("super_admin"), asyncHandler(createSeoService));
router.put("/:id", requireAuth, requireRole("super_admin"), asyncHandler(updateSeoService));
router.delete("/:id", requireAuth, requireRole("super_admin"), asyncHandler(deleteSeoService));

module.exports = router;
