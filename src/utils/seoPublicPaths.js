"use strict";

const AIRPORT_CAB_BOOKING_CITIES = ["chennai", "trichy", "madurai", "coimbatore"];
const ACTING_DRIVER_HUB_CITIES = AIRPORT_CAB_BOOKING_CITIES;
const TRICHY_CITY_ALIASES = ["tiruchi", "tiruchirappalli", "tiruchirapalli"];

function cityCabLandingPath(citySlug) {
  const slug = String(citySlug || "").toLowerCase();
  if (!slug) return "/car-rental";
  return `/${slug}`;
}

function isActingDriverHubCity(citySlug) {
  return ACTING_DRIVER_HUB_CITIES.includes(String(citySlug || "").toLowerCase());
}

function actingDriverLandingPath(citySlug) {
  const slug = String(citySlug || "").toLowerCase();
  if (!slug) return "/acting-driver";
  if (isActingDriverHubCity(slug)) return `/${slug}/acting-driver`;
  return `/acting-driver/${slug}`;
}

function isAirportCabBookingCity(citySlug) {
  return AIRPORT_CAB_BOOKING_CITIES.includes(String(citySlug || "").toLowerCase());
}

function airportCabBookingPath(citySlug) {
  const slug = String(citySlug || "").toLowerCase();
  if (!slug) return "/airport-cab-booking";
  return `/${slug}/airport-cab-booking`;
}

function airportTaxiPublicPath(citySlug) {
  const slug = String(citySlug || "").toLowerCase();
  if (isAirportCabBookingCity(slug)) return airportCabBookingPath(slug);
  return `/services/airport-taxi/${slug}`;
}

function seoCityPublicPath(pageType, citySlug) {
  if (pageType === "acting-driver") return actingDriverLandingPath(citySlug);
  if (pageType === "airport-cab-booking") return airportCabBookingPath(citySlug);
  return cityCabLandingPath(citySlug);
}

function seoLandingPublicPath(slug) {
  const s = String(slug || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s ? `/pages/${s}` : "/pages";
}

module.exports = {
  AIRPORT_CAB_BOOKING_CITIES,
  ACTING_DRIVER_HUB_CITIES,
  TRICHY_CITY_ALIASES,
  cityCabLandingPath,
  actingDriverLandingPath,
  isActingDriverHubCity,
  isAirportCabBookingCity,
  airportCabBookingPath,
  airportTaxiPublicPath,
  seoCityPublicPath,
  seoLandingPublicPath
};
