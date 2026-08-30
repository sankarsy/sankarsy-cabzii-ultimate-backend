const express = require("express");
const {
  listTestimonials,
  getTestimonialById,
  submitPublicTestimonial,
  createTestimonial,
  updateTestimonial,
  publishTestimonial,
  deleteTestimonial
} = require("../controllers/testimonialController");
const { asyncHandler } = require("../utils/asyncHandler");
const { optionalAuth, requireAuth, requireRole } = require("../middlewares/auth");
const { publicReviewLimiter } = require("../middlewares/rateLimit");

const router = express.Router();

router.get("/", optionalAuth, asyncHandler(listTestimonials));
router.post("/public", publicReviewLimiter, asyncHandler(submitPublicTestimonial));
router.post("/", requireAuth, requireRole("super_admin"), asyncHandler(createTestimonial));
router.get("/:id", requireAuth, requireRole("super_admin"), asyncHandler(getTestimonialById));
router.put("/:id", requireAuth, requireRole("super_admin"), asyncHandler(updateTestimonial));
router.patch("/:id/publish", requireAuth, requireRole("super_admin"), asyncHandler(publishTestimonial));
router.delete("/:id", requireAuth, requireRole("super_admin"), asyncHandler(deleteTestimonial));

module.exports = router;
