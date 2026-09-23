/** Call Driver / Acting Driver service tariffs — stored in SiteSettings, merged with these defaults. */

const CALL_DRIVER_SERVICE_TYPES = ["local", "outstation", "airport", "school", "corporate", "valet"];

/** Bump when published rates change so stale SiteSettings rows do not keep old extra-hour / per-day slabs. */
const CALL_DRIVER_TARIFF_VERSION = 3;

const DEFAULT_CALL_DRIVER_TARIFF = {
  version: CALL_DRIVER_TARIFF_VERSION,
  nightStartHour: 22,
  nightStartMinute: 15,
  nightEndHour: 5,
  nightEndMinute: 30,
  cancelCharge: 100,
  local: {
    minHours: 3,
    standard: 450,
    premium: 450,
    extraHourStandard: 100,
    extraHourPremium: 100,
    nightCharge: 100,
    dropChargeMin: 50,
    dropCharge: 100,
    dropKm: 5,
    outOfCityCharge: 100,
    outOfCityKm: 40
  },
  outstation: {
    perDayHours: 12,
    perDayStandard: 1500,
    perDayPremium: 1500,
    extraHourStandard: 100,
    extraHourPremium: 100,
    oneWayMinKm: 250,
    oneWayRate: 1700,
    cancelCharge: 100,
    foodStayNote:
      "Return trips: driver accommodation is extra (you arrange stay — not in this fare). One-way ₹1,700 includes bus fare for the driver."
  },
  airport: {
    minHours: 3,
    standard: 450,
    premium: 450,
    extraHourStandard: 100,
    extraHourPremium: 100,
    nightCharge: 100
  },
  valet: {
    driverRate: 600,
    minHours: 5,
    extraHour: 100,
    supervisorRate: 700,
    driversPerSupervisor: 10
  },
  monthly: {
    extraHour: 60,
    normal10: 22000,
    normal12: 22000,
    luxury10: 24000,
    luxury12: 26000
  },
  school: {
    quoteOnly: true
  },
  corporate: {
    quoteOnly: true
  }
};

const CALL_DRIVER_SERVICE_CATALOG = [
  {
    id: "local",
    title: "Local Driver",
    blurb: "Driver for your own car for local city trips.",
    cta: "Book Now",
    quoteOnly: false,
    fromKey: "local.standard"
  },
  {
    id: "outstation",
    title: "Outstation Driver",
    blurb: "Hire a driver for your outstation trip.",
    cta: "Book Now",
    quoteOnly: false,
    fromKey: "outstation.perDayStandard"
  },
  {
    id: "airport",
    title: "Airport Driver",
    blurb: "Driver for airport pickup or drop in your own vehicle.",
    cta: "Book Now",
    quoteOnly: false,
    fromKey: "airport.standard"
  },
  {
    id: "school",
    title: "Monthly Driver",
    blurb: "School, personal or regular monthly driver requirement.",
    cta: "Request Quote",
    quoteOnly: true,
    fromKey: "monthly.normal10"
  },
  {
    id: "corporate",
    title: "Corporate Driver",
    blurb: "Dedicated drivers for corporate requirements.",
    cta: "Get Corporate Quote",
    quoteOnly: true
  },
  {
    id: "valet",
    title: "Valet Parking",
    blurb: "Professional drivers for events and functions.",
    cta: "Book Now",
    quoteOnly: false,
    fromKey: "valet.driverRate"
  }
];

function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function bumpExtraHour(block) {
  const next = { ...(block || {}) };
  if (num(next.extraHourStandard) === 80) next.extraHourStandard = 100;
  if (num(next.extraHourPremium) === 80) next.extraHourPremium = 100;
  if (num(next.extraHour) === 70) next.extraHour = 100;
  return next;
}

function bumpOutstationDayRate(block) {
  const next = bumpExtraHour(block);
  if ([1100, 1200, 1300].includes(num(next.perDayStandard))) next.perDayStandard = 1500;
  if ([1100, 1200, 1300].includes(num(next.perDayPremium))) next.perDayPremium = 1500;
  return next;
}

function mergeCallDriverTariff(stored) {
  const src = stored && typeof stored === "object" ? stored : {};
  const stale = num(src.version, 0) < CALL_DRIVER_TARIFF_VERSION;
  const rates = stale ? {} : src;
  return {
    version: CALL_DRIVER_TARIFF_VERSION,
    nightStartHour: num(rates.nightStartHour, DEFAULT_CALL_DRIVER_TARIFF.nightStartHour),
    nightStartMinute: num(rates.nightStartMinute, DEFAULT_CALL_DRIVER_TARIFF.nightStartMinute),
    nightEndHour: num(rates.nightEndHour, DEFAULT_CALL_DRIVER_TARIFF.nightEndHour),
    nightEndMinute: num(rates.nightEndMinute, DEFAULT_CALL_DRIVER_TARIFF.nightEndMinute),
    cancelCharge: num(rates.cancelCharge, DEFAULT_CALL_DRIVER_TARIFF.cancelCharge),
    local: bumpExtraHour({ ...DEFAULT_CALL_DRIVER_TARIFF.local, ...(rates.local || {}) }),
    outstation: bumpOutstationDayRate({ ...DEFAULT_CALL_DRIVER_TARIFF.outstation, ...(rates.outstation || {}) }),
    airport: bumpExtraHour({ ...DEFAULT_CALL_DRIVER_TARIFF.airport, ...(rates.airport || {}) }),
    valet: bumpExtraHour({ ...DEFAULT_CALL_DRIVER_TARIFF.valet, ...(rates.valet || {}) }),
    monthly: { ...DEFAULT_CALL_DRIVER_TARIFF.monthly, ...(rates.monthly || {}) },
    school: { ...DEFAULT_CALL_DRIVER_TARIFF.school, ...(rates.school || {}) },
    corporate: { ...DEFAULT_CALL_DRIVER_TARIFF.corporate, ...(rates.corporate || {}) }
  };
}

function tariffFromPrice(tariff, key) {
  if (!key) return null;
  const [group, field] = String(key).split(".");
  const n = num(tariff?.[group]?.[field]);
  return n > 0 ? n : null;
}

function publicCallDriverServices(tariff) {
  const merged = mergeCallDriverTariff(tariff);
  return CALL_DRIVER_SERVICE_CATALOG.map((svc) => ({
    id: svc.id,
    title: svc.title,
    blurb: svc.blurb,
    cta: svc.cta,
    quoteOnly: Boolean(svc.quoteOnly),
    fromPrice: svc.quoteOnly && !svc.fromKey ? null : tariffFromPrice(merged, svc.fromKey)
  }));
}

module.exports = {
  CALL_DRIVER_SERVICE_TYPES,
  CALL_DRIVER_TARIFF_VERSION,
  DEFAULT_CALL_DRIVER_TARIFF,
  CALL_DRIVER_SERVICE_CATALOG,
  mergeCallDriverTariff,
  publicCallDriverServices
};
