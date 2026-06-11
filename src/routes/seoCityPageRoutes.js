const express = require("express");
const {
  listSeoCityPages,
  getSeoCityPage,
  createSeoCityPage,
  updateSeoCityPage,
  deleteSeoCityPage
} = require("../controllers/seoCityPageController");
const { asyncHandler } = require("../utils/asyncHandler");
const { requireAuth, requireRole, optionalAuth } = require("../middlewares/auth");

const router = express.Router();

router.get("/", optionalAuth, asyncHandler(listSeoCityPages));
router.get("/:pageType/:citySlug", optionalAuth, asyncHandler(getSeoCityPage));
router.get("/:pageType", optionalAuth, asyncHandler(getSeoCityPage));
router.post("/", requireAuth, requireRole("super_admin"), asyncHandler(createSeoCityPage));
router.put("/:id", requireAuth, requireRole("super_admin"), asyncHandler(updateSeoCityPage));
router.delete("/:id", requireAuth, requireRole("super_admin"), asyncHandler(deleteSeoCityPage));

module.exports = router;
