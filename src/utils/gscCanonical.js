"use strict";

const DEFAULT_CANONICAL_ORIGIN = "https://www.cabzii.in";

const CITY_SLUG_ALIASES = {
  bangalore: "bengaluru",
  maduravoyal: "chennai",
  kancheepuram: "kanchipuram",
  kanchepuram: "kanchipuram",
  tuticorin: "thoothukudi",
  tirupur: "tiruppur",
  tiruchi: "trichy",
  tiruchirappalli: "trichy",
  tanjore: "thanjavur",
  kanniyakumari: "kanyakumari",
  thiruvannamalai: "tiruvannamalai"
};

const SERVICE_URL_PREFIXES = new Set([
  "car-rental",
  "cab-rental",
  "airport-taxi",
  "local-taxi",
  "outstation-cab",
  "one-way-cab",
  "driver-on-hire",
  "chauffeur-service",
  "tempo-traveller",
  "hourly-rental",
  "tour-packages",
  "holiday-packages"
]);

const TRAVELS_URL_PREFIXES = new Set(["travels", "travel", "travel-agency"]);

function resolveCitySlug(raw) {
  const key = String(raw || "").toLowerCase();
  return CITY_SLUG_ALIASES[key] || key;
}

function stripToPath(input = "") {
  let raw = String(input || "").trim();
  if (!raw) return "";
  raw = raw.split("#")[0];
  if (raw.startsWith("//")) raw = `https:${raw}`;
  try {
    if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) {
      const u = new URL(raw);
      raw = u.pathname || "/";
    } else {
      raw = raw.split("?")[0];
    }
  } catch {
    raw = raw.split("?")[0];
  }
  raw = raw.toLowerCase();
  if (!raw.startsWith("/")) raw = `/${raw}`;
  raw = raw.replace(/\/{2,}/g, "/");
  if (raw.length > 1) raw = raw.replace(/\/+$/, "");
  return raw || "/";
}

function foldAliasPath(pathname) {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  const parts = normalized.split("/").filter(Boolean);

  if (parts.length === 2) {
    const [prefix, city] = parts;
    if (SERVICE_URL_PREFIXES.has(prefix)) {
      const serviceSlug = prefix === "holiday-packages" ? "tour-packages" : prefix;
      return `/services/${serviceSlug}/${resolveCitySlug(city)}`;
    }
    if (TRAVELS_URL_PREFIXES.has(prefix)) {
      return `/cab-booking/${resolveCitySlug(city)}`;
    }
  }

  if (parts[0] === "routes" && parts[1]) {
    const taxi = parts[1].match(/^([a-z0-9-]+)-to-([a-z0-9-]+)-taxi$/);
    if (taxi) {
      return `/routes/${resolveCitySlug(taxi[1])}-to-${resolveCitySlug(taxi[2])}-cab`;
    }
    const cab = parts[1].match(/^([a-z0-9-]+)-to-([a-z0-9-]+)-cab$/);
    if (cab) {
      return `/routes/${resolveCitySlug(cab[1])}-to-${resolveCitySlug(cab[2])}-cab`;
    }
  }

  if (parts.length === 3 && parts[0] === "services") {
    const service = parts[1] === "holiday-packages" ? "tour-packages" : parts[1];
    return `/services/${service}/${resolveCitySlug(parts[2])}`;
  }

  if (parts.length === 2 && (parts[0] === "acting-driver" || parts[0] === "cab-booking")) {
    return `/${parts[0]}/${resolveCitySlug(parts[1])}`;
  }

  return normalized;
}

function canonicalizeGscPage(input, canonicalOrigin = DEFAULT_CANONICAL_ORIGIN) {
  const path = foldAliasPath(stripToPath(input));
  if (!path || path === "/") return path;
  return path.slice(0, 200);
}

function parseLandingMeta(landingPage = "") {
  const path = canonicalizeGscPage(landingPage);
  const parts = path.split("/").filter(Boolean);
  const meta = {
    landingPage: path,
    pageType: "other",
    city: "",
    service: "",
    origin: "",
    destination: "",
    route: ""
  };

  if (parts[0] === "services" && parts[1] && parts[2]) {
    meta.pageType = parts[1] === "tour-packages" ? "tour" : "service";
    meta.service = parts[1];
    meta.city = parts[2];
    return meta;
  }
  if (parts[0] === "routes" && parts[1]) {
    const m = parts[1].match(/^([a-z0-9-]+)-to-([a-z0-9-]+)-cab$/);
    meta.pageType = "route";
    if (m) {
      meta.origin = m[1];
      meta.destination = m[2];
      meta.route = `${m[1]}-${m[2]}`;
      meta.city = m[1];
      meta.service = "one-way-cab";
    }
    return meta;
  }
  if (parts[0] === "acting-driver" && parts[1]) {
    meta.pageType = "acting-driver";
    meta.service = "acting-driver";
    meta.city = parts[1];
    return meta;
  }
  if (parts[0] === "cab-booking" && parts[1]) {
    meta.pageType = "city-hub";
    meta.service = "cab-booking";
    meta.city = parts[1];
    return meta;
  }
  if (parts[0] === "call-driver") {
    meta.pageType = "call-driver";
    meta.service = "acting-driver";
    return meta;
  }
  if (parts[0] === "holidays" || parts[0] === "tour-packages") {
    meta.pageType = "tour";
    meta.service = "tours";
    return meta;
  }
  return meta;
}

function ymd(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function gscSafeRange(period, now = new Date()) {
  const lag = new Date(now);
  lag.setDate(lag.getDate() - 3);
  lag.setHours(23, 59, 59, 999);
  const bookingStart = new Date(period.start);
  const bookingEnd = new Date(period.end);
  const gscEnd = bookingEnd < lag ? bookingEnd : lag;
  let gscStart = new Date(bookingStart);
  gscStart.setHours(0, 0, 0, 0);
  if (gscStart > gscEnd) gscStart = new Date(gscEnd);
  return {
    booking: { start: ymd(bookingStart), end: ymd(bookingEnd) },
    gsc: { start: ymd(gscStart), end: ymd(gscEnd) },
    rangesDiffer: ymd(bookingStart) !== ymd(gscStart) || ymd(bookingEnd) !== ymd(gscEnd),
    warning: ymd(bookingEnd) !== ymd(gscEnd)
      ? "GSC data lags about 3 days. Booking range and Search Console range are not identical."
      : ""
  };
}

module.exports = {
  DEFAULT_CANONICAL_ORIGIN,
  canonicalizeGscPage,
  parseLandingMeta,
  ymd,
  gscSafeRange,
  resolveCitySlug
};
