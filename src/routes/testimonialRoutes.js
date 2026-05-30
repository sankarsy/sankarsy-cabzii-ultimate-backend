const express = require("express");
const {
  listTestimonials,
  getTestimonialById,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial
} = require("../controllers/testimonialController");
const { asyncHandler } = require("../utils/asyncHandler");
const { optionalAuth, requireAuth, requireRole } = require("../middlewares/auth");

const router = express.Router();

router.get("/", optionalAuth, asyncHandler(listTestimonials));
router.post("/", requireAuth, requireRole("super_admin"), asyncHandler(createTestimonial));
router.get("/:id", requireAuth, requireRole("super_admin"), asyncHandler(getTestimonialById));
router.put("/:id", requireAuth, requireRole("super_admin"), asyncHandler(updateTestimonial));
router.delete("/:id", requireAuth, requireRole("super_admin"), asyncHandler(deleteTestimonial));

module.exports = router;
