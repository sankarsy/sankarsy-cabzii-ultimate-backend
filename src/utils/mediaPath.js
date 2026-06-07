"use strict";

function normalizeStoredImagePath(path) {
  if (path == null) return "";
  const trimmed = String(path).trim();
  if (!trimmed) return "";

  const match = trimmed.match(/\/uploads\/([^?#]+)/i);
  if (match) return `/uploads/${match[1]}`;
  if (trimmed.startsWith("uploads/")) return `/${trimmed}`;
  return trimmed;
}

function normalizeGalleryPaths(gallery) {
  if (!Array.isArray(gallery)) return [];
  return gallery.map((item) => normalizeStoredImagePath(item)).filter(Boolean).slice(0, 3);
}

function normalizeCatalogMediaFields(payload) {
  if (!payload || typeof payload !== "object") return payload;
  const next = { ...payload };
  if ("image" in next) next.image = normalizeStoredImagePath(next.image);
  if ("gallery" in next) next.gallery = normalizeGalleryPaths(next.gallery);
  return next;
}

module.exports = {
  normalizeStoredImagePath,
  normalizeGalleryPaths,
  normalizeCatalogMediaFields
};
