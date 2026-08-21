/** Call Driver / Acting Driver service tariffs — stored in SiteSettings, merged with these defaults. */

const CALL_DRIVER_SERVICE_TYPES = ["local", "outstation", "airport", "school", "corporate", "valet"];

const DEFAULT_CALL_DRIVER_TARIFF = {
  nightStartHour: 22,
  nightEndHour: 6,
  local: {
    minHours: 4,
    standard: 500,
    premium: 600,
    extraHourStandard: 80,
    extraHourPremium: 100,
    nightCharge: 100
  },
  outstation: {
    perDayHours: 12,
    perDayStandard: 1100,
    perDayPremium: 1200,
    longKmThreshold: 400,
    perDayLongStandard: 1200,
    perDayLongPremium: 1300,
    extraHourStandard: 80,
    extraHourPremium: 100,
    nightCharge: 100,
    foodStayNote: "Food and accommodation for the driver are the customer's responsibility."
  },
  airport: {
    minHours: 4,
    standard: 500,
    premium: 600,
    extraHourStandard: 80,
    extraHourPremium: 100,
    nightCharge: 100
  },
  valet: {
    driverRate: 650,
    minHours: 5,
    extraHour: 70,
    supervisorRate: 700,
    driversPerSupervisor: 10
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
    title: "Local Chennai Driver",
    blurb: "Driver for your own car within Chennai.",
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
    quoteOnly: true
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

function mergeCallDriverTariff(stored) {
  const src = stored && typeof stored === "object" ? stored : {};
  return {
    nightStartHour: num(src.nightStartHour, DEFAULT_CALL_DRIVER_TARIFF.nightStartHour),
    nightEndHour: num(src.nightEndHour, DEFAULT_CALL_DRIVER_TARIFF.nightEndHour),
    local: { ...DEFAULT_CALL_DRIVER_TARIFF.local, ...(src.local || {}) },
    outstation: { ...DEFAULT_CALL_DRIVER_TARIFF.outstation, ...(src.outstation || {}) },
    airport: { ...DEFAULT_CALL_DRIVER_TARIFF.airport, ...(src.airport || {}) },
    valet: { ...DEFAULT_CALL_DRIVER_TARIFF.valet, ...(src.valet || {}) },
    school: { ...DEFAULT_CALL_DRIVER_TARIFF.school, ...(src.school || {}) },
    corporate: { ...DEFAULT_CALL_DRIVER_TARIFF.corporate, ...(src.corporate || {}) }
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
    fromPrice: svc.quoteOnly ? null : tariffFromPrice(merged, svc.fromKey)
  }));
}

module.exports = {
  CALL_DRIVER_SERVICE_TYPES,
  DEFAULT_CALL_DRIVER_TARIFF,
  CALL_DRIVER_SERVICE_CATALOG,
  mergeCallDriverTariff,
  publicCallDriverServices
};
