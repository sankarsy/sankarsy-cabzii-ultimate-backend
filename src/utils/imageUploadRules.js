"use strict";

const IMAGE_UPLOAD_RULES = {
  maxBytes: 1 * 1024 * 1024,
  maxMb: 1,
  minWidth: 1200,
  minHeight: 750,
  recommendedWidth: 1600,
  recommendedHeight: 1000,
  mimeTypes: ["image/jpeg", "image/png", "image/webp"]
};

function formatBytesAsMb(bytes) {
  return `${(Number(bytes || 0) / (1024 * 1024)).toFixed(1)} MB`;
}

function sizeErrorMessage(bytes) {
  return `Image is ${formatBytesAsMb(bytes)}. Maximum allowed size is ${IMAGE_UPLOAD_RULES.maxMb} MB.`;
}

function dimensionErrorMessage(width, height) {
  return `Image is ${width} × ${height} px. Minimum is ${IMAGE_UPLOAD_RULES.minWidth} × ${IMAGE_UPLOAD_RULES.minHeight} px.`;
}

module.exports = {
  IMAGE_UPLOAD_RULES,
  formatBytesAsMb,
  sizeErrorMessage,
  dimensionErrorMessage
};
