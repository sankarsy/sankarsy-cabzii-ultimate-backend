const express = require("express");
const {
  createCab,
  deleteCab,
  duplicateCab,
  getCabById,
  getFeaturedCabs,
  getPopularCabs,
  getRecommendedCabs,
  getRelatedCabs,
  listCabs,
  updateCab
} = require("../controllers/cabController");
const { asyncHandler } = require("../utils/asyncHandler");
const { optionalAuth, requireAuth, requireRole } = require("../middlewares/auth");

const router = express.Router();

router.get("/featured", optionalAuth, asyncHandler(getFeaturedCabs));
router.get("/recommended", optionalAuth, asyncHandler(getRecommendedCabs));
router.get("/popular", optionalAuth, asyncHandler(getPopularCabs));
router.get("/related/:id", optionalAuth, asyncHandler(getRelatedCabs));
router.get("/", optionalAuth, asyncHandler(listCabs));
router.get("/:id", optionalAuth, asyncHandler(getCabById));
router.post("/", requireAuth, requireRole("super_admin", "vendor_admin"), asyncHandler(createCab));
router.post("/:id/duplicate", requireAuth, requireRole("super_admin", "vendor_admin"), asyncHandler(duplicateCab));
router.put("/:id", requireAuth, requireRole("super_admin", "vendor_admin"), asyncHandler(updateCab));
router.delete("/:id", requireAuth, requireRole("super_admin", "vendor_admin"), asyncHandler(deleteCab));

module.exports = router;
