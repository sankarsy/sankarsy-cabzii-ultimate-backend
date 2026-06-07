"use strict";

function titleCaseCity(slug = "") {
  return String(slug)
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function autoSeoServiceFields({ name = "", seoTitle = "", seoDescription = "", seo = "", menuCitySlug = "chennai", priceFrom = 0 }) {
  const cityLabel = titleCaseCity(menuCitySlug) || "Chennai";
  const label = name || "Cab Service";
  const title = seoTitle || `${label} ${cityLabel}: Book Online, Fares & 24×7 Pickup | cabzii.in`;
  const description =
    seoDescription ||
    `Book ${label.toLowerCase()} in ${cityLabel} with AC cabs, transparent fares from ₹${priceFrom || 899} and instant confirmation on cabzii.in.`;
  const keywords =
    seo ||
    `${label.toLowerCase()} ${cityLabel.toLowerCase()},book ${label.toLowerCase()} online,${cityLabel.toLowerCase()} cab booking,cabzii ${label.toLowerCase()}`;
  return { seoTitle: title, seoDescription: description, seo: keywords, name: name || label };
}

function autoSeoRouteFields({
  title = "",
  seoTitle = "",
  seoDescription = "",
  seo = "",
  fromCitySlug = "",
  toCitySlug = "",
  distance = "",
  sedanFrom = 0
}) {
  const from = titleCaseCity(fromCitySlug);
  const to = titleCaseCity(toCitySlug);
  const routeLabel = title || `${from} to ${to} Cab`;
  const titleOut = seoTitle || `${routeLabel}: Book One-Way & Round Trip | cabzii.in`;
  const description =
    seoDescription ||
    `Book ${from} to ${to} cab online${distance ? ` (${distance})` : ""}. Sedan from ₹${sedanFrom || 1400} with transparent fares on cabzii.in.`;
  const keywords =
    seo ||
    `${from.toLowerCase()} to ${to.toLowerCase()} cab,${from.toLowerCase()} ${to.toLowerCase()} taxi fare,one way cab ${from.toLowerCase()} ${to.toLowerCase()},cabzii outstation`;
  return { seoTitle: titleOut, seoDescription: description, seo: keywords, title: routeLabel };
}

module.exports = { autoSeoServiceFields, autoSeoRouteFields, titleCaseCity };
