const express = require("express");
const {
  submitReview,
  listReviews,
  getReviewSummary,
  getReviewForBooking,
  updateReviewStatus,
  deleteReview
} = require("../controllers/reviewController");
const { asyncHandler } = require("../utils/asyncHandler");
const { optionalAuth, requireAuth, requireRole } = require("../middlewares/auth");

const router = express.Router();

router.get("/", optionalAuth, asyncHandler(listReviews));
router.get("/summary", asyncHandler(getReviewSummary));
router.get("/for-booking", asyncHandler(getReviewForBooking));
router.post("/", asyncHandler(submitReview));
router.patch("/:id/status", requireAuth, requireRole("super_admin"), asyncHandler(updateReviewStatus));
router.delete("/:id", requireAuth, requireRole("super_admin"), asyncHandler(deleteReview));

module.exports = router;
