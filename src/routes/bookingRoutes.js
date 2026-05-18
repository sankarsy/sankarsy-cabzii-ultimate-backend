const express = require("express");
const {
  createBooking,
  listBookings,
  updateBookingStatus,
  updateBooking,
  deleteBooking
} = require("../controllers/bookingController");
const { asyncHandler } = require("../utils/asyncHandler");
const { requireAuth, optionalAuth, requireRole } = require("../middlewares/auth");

const router = express.Router();

router.post("/", optionalAuth, asyncHandler(createBooking));
router.get("/", requireAuth, asyncHandler(listBookings));
router.patch("/:id/status", requireAuth, requireRole("super_admin", "vendor_admin"), asyncHandler(updateBookingStatus));
router.put("/:id", requireAuth, requireRole("super_admin", "vendor_admin"), asyncHandler(updateBooking));
router.delete("/:id", requireAuth, requireRole("super_admin", "vendor_admin"), asyncHandler(deleteBooking));

module.exports = router;
