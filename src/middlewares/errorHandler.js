"use strict";

function notFoundHandler(req, res) {
  return res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
  });
}

function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal server error";

  // JWT Errors
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
  }

  // Mongo duplicate key
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0];
    message = `${field} already exists`;
  }

  // Mongoose validation
  if (err.name === "ValidationError") {
    statusCode = 400;

    const errors = Object.values(err.errors).map(
      (val) => val.message
    );

    message = errors.join(", ");
  }

  // Cast error
  if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid resource ID";
  }

  // Production logging
  if (statusCode >= 500) {
    console.error("SERVER ERROR:", {
      message: err.message,
      stack: err.stack,
      path: req.originalUrl,
      method: req.method,
    });
  }

  return res.status(statusCode).json({
    success: false,
    message,

    ...(process.env.NODE_ENV === "development" && {
      stack: err.stack,
    }),
  });
}

module.exports = {
  errorHandler,
  notFoundHandler,
};