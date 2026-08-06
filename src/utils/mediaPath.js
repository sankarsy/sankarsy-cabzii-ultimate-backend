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

function suggestCatalogImageAlt(payload = {}) {
  const name = payload.vehicleName || payload.vehicleModel || payload.title || payload.name || "Cabzii service";
  const city = payload.city || payload.destination || "India";
  const text = [payload.type, payload.category, name].filter(Boolean).join(" ").toLowerCase();
  if (/driver|chauffeur/.test(text)) return `Professional acting driver service for safe travel in ${city}`;
  if (/holiday|tour|package|pilgrimage/.test(text)) {
    return `${name} holiday package with hotel stay and sightseeing in ${city}`;
  }
  if (/bus|volvo|sleeper/.test(text)) return `${name} AC bus rental for group travel and outstation trips from ${city}`;
  return `${name} cab rental for airport and outstation travel in ${city}`;
}

function isWeakImageAlt(alt) {
  const t = String(alt || "").trim();
  if (!t || t.length < 8) return true;
  if (/^(image|photo|picture|img|car|cab image|hotel image)$/i.test(t)) return true;
  if (/\.(jpg|jpeg|png|webp|gif|svg)$/i.test(t)) return true;
  return false;
}

function normalizeCatalogMediaFields(payload) {
  if (!payload || typeof payload !== "object") return payload;
  const next = { ...payload };
  if ("image" in next) next.image = normalizeStoredImagePath(next.image);
  if ("gallery" in next) next.gallery = normalizeGalleryPaths(next.gallery);

  if (Array.isArray(next.images) && next.images.length) {
    next.images = next.images.map((img) => {
      if (!img || typeof img !== "object") return img;
      return { ...img, url: normalizeStoredImagePath(img.url) };
    });
    const cover = next.images.find((img) => img?.type === "cover") || next.images[0];
    if (cover?.url) {
      next.image = cover.url;
      if (cover.alt) next.imageAlt = cover.alt;
      if (cover.title) next.imageTitle = cover.title;
    }
  }

  if (next.image) {
    const es = next.enterpriseSeo && typeof next.enterpriseSeo === "object" ? { ...next.enterpriseSeo } : {};
    es.ogImage = next.image;
    es.twitterImage = next.image;
    next.enterpriseSeo = es;
  }

  if (next.image && isWeakImageAlt(next.imageAlt)) {
    next.imageAlt = suggestCatalogImageAlt(next);
  }
  if (next.image && !String(next.imageTitle || "").trim()) {
    next.imageTitle = next.vehicleName || next.title || next.name || next.imageAlt || "";
  }

  return next;
}

module.exports = {
  normalizeStoredImagePath,
  normalizeGalleryPaths,
  normalizeCatalogMediaFields
};
