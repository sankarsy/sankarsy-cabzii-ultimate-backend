const express = require("express");
const {
  sendOtpController,
  verifyOtpController,
  partnerLoginController,
  adminLoginController,
  meController
} = require("../controllers/authController");
const { asyncHandler } = require("../utils/asyncHandler");
const { requireAuth } = require("../middlewares/auth");
const { otpSendLimiter, otpVerifyLimiter } = require("../middlewares/rateLimit");

const router = express.Router();

router.post("/send-otp", otpSendLimiter, asyncHandler(sendOtpController));
router.post("/verify-otp", otpVerifyLimiter, asyncHandler(verifyOtpController));
router.post("/partner-login", otpVerifyLimiter, asyncHandler(partnerLoginController));
router.post("/admin-login", otpVerifyLimiter, asyncHandler(adminLoginController));
router.get("/me", requireAuth, asyncHandler(meController));

module.exports = router;
