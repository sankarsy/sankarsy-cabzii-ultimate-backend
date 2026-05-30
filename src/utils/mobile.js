"use strict";

/** Normalize to 10-digit Indian mobile (stores without +91). */
function normalizeMobileNumber(input) {
  const digits = String(input || "").replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return null;
}

function mobileSchemaJoi() {
  const Joi = require("joi");
  return Joi.string()
    .custom((value, helpers) => {
      const normalized = normalizeMobileNumber(value);
      if (!normalized) return helpers.error("any.invalid");
      return normalized;
    })
    .required();
}

module.exports = { normalizeMobileNumber, mobileSchemaJoi };
