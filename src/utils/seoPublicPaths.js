"use strict";

function cityCabLandingPath(citySlug) {
  const slug = String(citySlug || "").toLowerCase();
  return `/car-rental/${slug}-city-cabs`;
}

function actingDriverLandingPath(citySlug) {
  const slug = String(citySlug || "").toLowerCase();
  if (!slug) return "/acting-driver";
  return slug === "chennai" ? "/call-drivers-chennai" : `/acting-driver/${slug}`;
}

function seoCityPublicPath(pageType, citySlug) {
  if (pageType === "acting-driver") return actingDriverLandingPath(citySlug);
  return cityCabLandingPath(citySlug);
}

module.exports = {
  cityCabLandingPath,
  actingDriverLandingPath,
  seoCityPublicPath
};
