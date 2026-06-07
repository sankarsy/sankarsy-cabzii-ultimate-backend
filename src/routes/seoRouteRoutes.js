const express = require("express");
const {
  listSeoRoutes,
  getSeoRouteBySlug,
  createSeoRoute,
  updateSeoRoute,
  deleteSeoRoute
} = require("../controllers/seoRouteController");
const { asyncHandler } = require("../utils/asyncHandler");
const { requireAuth, requireRole, optionalAuth } = require("../middlewares/auth");

const router = express.Router();

router.get("/", optionalAuth, asyncHandler(listSeoRoutes));
router.get("/:slug", optionalAuth, asyncHandler(getSeoRouteBySlug));
router.post("/", requireAuth, requireRole("super_admin"), asyncHandler(createSeoRoute));
router.put("/:id", requireAuth, requireRole("super_admin"), asyncHandler(updateSeoRoute));
router.delete("/:id", requireAuth, requireRole("super_admin"), asyncHandler(deleteSeoRoute));

module.exports = router;
