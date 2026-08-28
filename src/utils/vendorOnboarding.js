"use strict";

function missingCabPublishFields(payload = {}) {
  const title = String(payload.title || payload.vehicleName || "").trim();
  const seats = Number(payload.seats);
  const packs = payload.farePackages && typeof payload.farePackages === "object" ? payload.farePackages : {};
  const packPrices = Object.values(packs).map((p) => Number(p?.price || p?.originalPrice || 0));
  const hasFare =
    Number(payload.price) > 0 ||
    Number(payload.startingPrice) > 0 ||
    Number(payload.pricePerKm) > 0 ||
    packPrices.some((n) => n > 0) ||
    (Array.isArray(payload.packages) && payload.packages.some((p) => Number(p?.price) > 0));

  const missing = [];
  if (!title) missing.push("vehicle name");
  if (!Number.isFinite(seats) || seats < 1) missing.push("seating capacity");
  if (!hasFare) missing.push("pricing");
  return missing;
}

function makeQuoteRef() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `CZQ-${out}`;
}

module.exports = { missingCabPublishFields, makeQuoteRef };
