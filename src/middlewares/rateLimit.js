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

const publicReviewLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: "Too many review submissions. Please try again later.",
});

/** Public enquiry upsert — generous enough for form updates, not per-keystroke. */
const publicEnquiryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
    return forwarded || req.ip || "unknown";
  },
  validate: false,
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      message: "Too many enquiry requests. Please try again later."
    });
  }
});

module.exports = {
  otpSendLimiter,
  otpVerifyLimiter,
  authLimiter,
  publicReviewLimiter,
  publicEnquiryLimiter,
};