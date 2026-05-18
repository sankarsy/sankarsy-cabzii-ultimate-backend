const express = require("express");
const { sendOtpController, verifyOtpController, adminLoginController, meController } = require("../controllers/authController");
const { asyncHandler } = require("../utils/asyncHandler");
const { requireAuth } = require("../middlewares/auth");

const router = express.Router();

router.post("/send-otp", asyncHandler(sendOtpController));
router.post("/verify-otp", asyncHandler(verifyOtpController));
router.post("/admin-login", asyncHandler(adminLoginController));
router.get("/me", requireAuth, asyncHandler(meController));

module.exports = router;
