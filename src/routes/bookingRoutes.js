const express = require("express");
const {
  createBooking,
  getBookingById,
  listBookings,
  updateBookingStatus,
  updateBooking,
  finishBooking,
  deleteBooking
} = require("../controllers/bookingController");
const { asyncHandler } = require("../utils/asyncHandler");
const { requireAuth, requireRole } = require("../middlewares/auth");

const router = express.Router();

router.post("/", requireAuth, asyncHandler(createBooking));
router.get("/", requireAuth, asyncHandler(listBookings));
router.get("/:id", requireAuth, asyncHandler(getBookingById));
router.patch("/:id/finish", requireAuth, asyncHandler(finishBooking));
router.patch("/:id/status", requireAuth, requireRole("super_admin", "vendor_admin"), asyncHandler(updateBookingStatus));
router.put("/:id", requireAuth, requireRole("super_admin", "vendor_admin"), asyncHandler(updateBooking));
router.delete("/:id", requireAuth, requireRole("super_admin", "vendor_admin"), asyncHandler(deleteBooking));

module.exports = router;
