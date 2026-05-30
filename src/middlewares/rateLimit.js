"use strict";

const rateLimit = require("express-rate-limit");

const createLimiter = ({
  windowMs,
  max,
  message,
}) =>
  rateLimit({
    windowMs,
    max,

    standardHeaders: true,
    legacyHeaders: false,

    handler: (req, res) => {
      return res.status(429).json({
        success: false,
        message,
      });
    },

    skipSuccessfulRequests: false,
  });

const otpSendLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many OTP requests. Please try again after 15 minutes.",
});

const otpVerifyLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: "Too many OTP verification attempts. Please try again later.",
});

const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests. Please slow down.",
});

module.exports = {
  otpSendLimiter,
  otpVerifyLimiter,
  authLimiter,
};