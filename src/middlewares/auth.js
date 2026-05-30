"use strict";

const jwt = require("jsonwebtoken");

const { User } = require("../models/User");

const { env } = require("../config/env");

const { HttpError } = require("../utils/httpError");

const { asyncHandler } = require("../utils/asyncHandler");

/**
 * Extract JWT token from Authorization header
 */
const extractToken = (req) => {
  const header = req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    return null;
  }

  return header.split(" ")[1];
};

/**
 * Verify JWT token
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, env.jwtSecret);
  } catch (error) {
    throw new HttpError(
      401,
      "Invalid or expired token"
    );
  }
};

/**
 * Required authentication middleware
 */
const requireAuth = asyncHandler(
  async (req, res, next) => {
    const token = extractToken(req);

    if (!token) {
      throw new HttpError(
        401,
        "Authentication required"
      );
    }

    const payload = verifyToken(token);

    const user = await User.findById(payload.sub)
      .select("-otp -__v")
      .lean();

    if (!user) {
      throw new HttpError(
        401,
        "User not found"
      );
    }

    if (user.isBlocked) {
      throw new HttpError(
        403,
        "Account blocked"
      );
    }

    req.user = {
      ...user,
      role: payload.role || user.role,
      mobileNumber: payload.mobileNumber || user.mobileNumber
    };

    req.token = token;

    next();
  }
);

/**
 * Optional authentication middleware
 */
const optionalAuth = asyncHandler(
  async (req, res, next) => {
    const token = extractToken(req);

    if (!token) {
      req.user = null;
      return next();
    }

    try {
      const payload = verifyToken(token);

      const user = await User.findById(payload.sub)
        .select("-otp -__v")
        .lean();

      req.user = user
        ? {
            ...user,
            role: payload.role || user.role,
            mobileNumber: payload.mobileNumber || user.mobileNumber
          }
        : null;

      req.token = token;
    } catch (error) {
      req.user = null;
    }

    next();
  }
);

/**
 * Role-based authorization
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(
        new HttpError(
          401,
          "Authentication required"
        )
      );
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new HttpError(
          403,
          "Access denied"
        )
      );
    }

    next();
  };
};

module.exports = {
  requireAuth,
  optionalAuth,
  requireRole,
};