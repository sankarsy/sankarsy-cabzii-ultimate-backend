"use strict";

const { RouteFare } = require("../models/RouteFare");
const { SeoRoute } = require("../models/SeoRoute");
const { slugify } = require("./slugify");

function citySlug(value) {
  return slugify(String(value || "").split(",")[0]);
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

function pricesFromDoc(doc = {}) {
  return {
    hatchback: num(doc.hatchback ?? doc.hatchbackFrom),
    sedan: num(doc.sedan ?? doc.sedanFrom),
    suv: num(doc.suv ?? doc.suvFrom),
    van: num(doc.van ?? doc.vanFrom)
  };
}

function titleCaseSlug(slug) {
  return String(slug || "")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

async function upsertRouteFare({ fromCitySlug, toCitySlug, fromName, toName, ...prices }) {
  const from = citySlug(fromCitySlug);
  const to = citySlug(toCitySlug);
  if (!from || !to || from === to) return null;
  const next = pricesFromDoc(prices);
  const data = await RouteFare.findOneAndUpdate(
    { fromCitySlug: from, toCitySlug: to },
    {
      fromCitySlug: from,
      toCitySlug: to,
      fromName: String(fromName || titleCaseSlug(from)).trim(),
      toName: String(toName || titleCaseSlug(to)).trim(),
      ...next
    },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
  );
  await SeoRoute.updateMany(
    { fromCitySlug: from, toCitySlug: to },
    {
      $set: {
        hatchbackFrom: next.hatchback,
        sedanFrom: next.sedan,
        suvFrom: next.suv,
        vanFrom: next.van
      }
    }
  );
  return data;
}

async function findRouteFare(fromRaw, toRaw) {
  const from = citySlug(fromRaw);
  const to = citySlug(toRaw);
  if (!from || !to) return null;
  const own = await RouteFare.findOne({ fromCitySlug: from, toCitySlug: to }).lean();
  if (own) return own;
  const seo = await SeoRoute.findOne({ fromCitySlug: from, toCitySlug: to }).lean();
  if (!seo) return null;
  const prices = pricesFromDoc(seo);
  if (!prices.hatchback && !prices.sedan && !prices.suv && !prices.van) return null;
  return {
    fromCitySlug: from,
    toCitySlug: to,
    fromName: titleCaseSlug(from),
    toName: titleCaseSlug(to),
    ...prices,
    source: "seo-route"
  };
}

module.exports = {
  citySlug,
  num,
  pricesFromDoc,
  upsertRouteFare,
  findRouteFare
};
