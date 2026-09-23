"use strict";

const { CALL_DRIVER_SERVICE_TYPES, mergeCallDriverTariff } = require("../config/callDriverTariff");

function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function roundMoney(value) {
  return Math.max(0, Math.round(num(value)));
}

function parseMinutesOfDay(time) {
  const raw = String(time || "").trim();
  const match = raw.match(/^(\d{1,2})(?::(\d{2}))?/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) return null;
  if (!Number.isFinite(minute) || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
}

function isNightPickup(time, tariff) {
  const mins = parseMinutesOfDay(time);
  if (mins == null) return false;
  const start = num(tariff.nightStartHour, 22) * 60 + num(tariff.nightStartMinute, 15);
  const end = num(tariff.nightEndHour, 5) * 60 + num(tariff.nightEndMinute, 30);
  if (start === end) return false;
  if (start > end) return mins >= start || mins < end;
  return mins >= start && mins < end;
}

function vehicleBand(input) {
  const raw = String(input?.vehicleType || input?.vehicleBand || "standard").toLowerCase();
  return raw === "premium" ? "premium" : "standard";
}

function extraHours(hours, minHours) {
  return Math.max(0, num(hours) - num(minHours));
}

function quoteLocalOrAirport(tariffBlock, input, tariff, kind) {
  const band = vehicleBand(input);
  const minHours = Math.max(1, num(tariffBlock.minHours, 3));
  const hours = Math.max(minHours, num(input.hours, minHours));
  const base = band === "premium" ? num(tariffBlock.premium) : num(tariffBlock.standard);
  const extraRate = band === "premium" ? num(tariffBlock.extraHourPremium) : num(tariffBlock.extraHourStandard);
  const extra = extraHours(hours, minHours);
  const extraCharge = extra * extraRate;
  const night = isNightPickup(input.pickupTime, tariff) ? num(tariffBlock.nightCharge) : 0;
  const km = num(input.estimatedKm || input.distanceKm);
  const outOfCityKm = num(tariffBlock.outOfCityKm, 40);
  const outOfCity = kind === "local" && km > outOfCityKm ? num(tariffBlock.outOfCityCharge) : 0;
  const total = roundMoney(base + extraCharge + night + outOfCity);
  return {
    quoteOnly: false,
    serviceType: kind,
    vehicleType: band,
    hours,
    minHours,
    basePrice: roundMoney(base),
    extraHours: extra,
    extraHourRate: extraRate,
    extraHourCharge: roundMoney(extraCharge),
    nightCharge: roundMoney(night),
    nightApplied: night > 0,
    total,
    pricingSource: `call-driver:${kind}:${band}`,
    lines: [
      { label: `${band === "premium" ? "Luxury" : "Normal"} · ${minHours} hrs`, amount: roundMoney(base) },
      extra > 0 ? { label: `Extra ${extra} hr${extra === 1 ? "" : "s"}`, amount: roundMoney(extraCharge) } : null,
      night > 0 ? { label: "Night charge (10:15 PM – 5:30 AM)", amount: roundMoney(night) } : null,
      outOfCity > 0 ? { label: `Out of city (over ${outOfCityKm} km)`, amount: roundMoney(outOfCity) } : null
    ].filter(Boolean)
  };
}

function isOneWayTrip(input) {
  const mode = String(input.tripMode || input.tripType || "").toLowerCase();
  if (mode === "one_way" || mode === "one-way" || mode === "oneway") return true;
  if (input.oneWay === true || input.oneWay === "true") return true;
  return false;
}

/** Inclusive calendar days from YYYY-MM-DD travel date to return date. Same day = 1. */
function inclusiveTripDays(start, end) {
  const parse = (value) => {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return null;
    return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  };
  const from = parse(start);
  const to = parse(end);
  if (from == null || to == null || to < from) return 0;
  return Math.round((to - from) / 86400000) + 1;
}

function resolveReturnDays(input) {
  const fromDates = inclusiveTripDays(input.date || input.travelDate, input.returnDate);
  if (fromDates > 0) return fromDates;
  return Math.max(1, num(input.days, 1));
}

function quoteOutstation(tariff, input) {
  const block = tariff.outstation;
  const band = vehicleBand(input);
  const km = num(input.estimatedKm || input.distanceKm);
  const oneWay = isOneWayTrip(input);

  if (oneWay) {
    const base = num(block.oneWayRate, 1700);
    return {
      quoteOnly: false,
      serviceType: "outstation",
      vehicleType: band,
      tripMode: "one_way",
      days: 1,
      hours: num(input.hours, 0) || null,
      estimatedKm: km || null,
      longKm: false,
      basePrice: roundMoney(base),
      extraHours: 0,
      extraHourRate: 0,
      extraHourCharge: 0,
      nightCharge: 0,
      nightApplied: false,
      total: roundMoney(base),
      pricingSource: `call-driver:outstation:one-way`,
      foodStayNote: block.foodStayNote || "",
      lines: [
        {
          label: `One-way (min ${num(block.oneWayMinKm, 250)} km, includes bus fare)`,
          amount: roundMoney(base)
        }
      ]
    };
  }

  const perDayHours = num(block.perDayHours, 12);
  const days = resolveReturnDays(input);
  const hours = num(input.hours, days * perDayHours) || days * perDayHours;
  const daily = band === "premium" ? num(block.perDayPremium) : num(block.perDayStandard);
  const includedHours = days * perDayHours;
  const extra = Math.max(0, hours - includedHours);
  const extraRate = band === "premium" ? num(block.extraHourPremium) : num(block.extraHourStandard);
  const extraCharge = extra * extraRate;
  const dailyTotal = daily * days;
  const total = roundMoney(dailyTotal + extraCharge);
  const stayNote =
    block.foodStayNote ||
    "Driver accommodation is extra on return trips (you arrange stay — not included in this fare).";
  return {
    quoteOnly: false,
    serviceType: "outstation",
    vehicleType: band,
    tripMode: "return",
    days,
    hours,
    perDayHours,
    perDayRate: roundMoney(daily),
    estimatedKm: km || null,
    longKm: false,
    basePrice: roundMoney(dailyTotal),
    extraHours: extra,
    extraHourRate: extraRate,
    extraHourCharge: roundMoney(extraCharge),
    nightCharge: 0,
    nightApplied: false,
    accommodationExtra: true,
    total,
    pricingSource: `call-driver:outstation:${band}:return`,
    foodStayNote: stayNote,
    lines: [
      {
        label: `${days} day${days === 1 ? "" : "s"} × ₹${roundMoney(daily)} · ${perDayHours} hrs/day`,
        amount: roundMoney(dailyTotal)
      },
      extra > 0 ? { label: `Extra ${extra} hr${extra === 1 ? "" : "s"} beyond ${includedHours} hrs`, amount: roundMoney(extraCharge) } : null,
      { label: "Driver accommodation", amount: 0, note: "Extra — you arrange stay" }
    ].filter(Boolean)
  };
}

function quoteValet(tariff, input) {
  const block = tariff.valet;
  const drivers = Math.max(1, Math.round(num(input.driversRequired || input.driverCount, 1)));
  const minHours = Math.max(1, num(block.minHours, 5));
  const hours = Math.max(minHours, num(input.hours, minHours));
  const per = num(block.driversPerSupervisor, 10) || 10;
  const supervisors = Math.ceil(drivers / per);
  const driverCharge = drivers * num(block.driverRate);
  const extra = extraHours(hours, minHours);
  const extraCharge = extra * num(block.extraHour) * drivers;
  const supervisorCharge = supervisors * num(block.supervisorRate);
  const total = roundMoney(driverCharge + extraCharge + supervisorCharge);
  return {
    quoteOnly: false,
    serviceType: "valet",
    driversRequired: drivers,
    supervisorCount: supervisors,
    hours,
    minHours,
    basePrice: roundMoney(driverCharge),
    extraHours: extra,
    extraHourRate: num(block.extraHour),
    extraHourCharge: roundMoney(extraCharge),
    supervisorCharge: roundMoney(supervisorCharge),
    nightCharge: 0,
    nightApplied: false,
    total,
    pricingSource: `call-driver:valet:${drivers}d-${supervisors}s`,
    lines: [
      { label: `${drivers} driver${drivers === 1 ? "" : "s"} × ₹${num(block.driverRate)}`, amount: roundMoney(driverCharge) },
      extra > 0
        ? { label: `Extra ${extra} hr${extra === 1 ? "" : "s"} × ${drivers} driver${drivers === 1 ? "" : "s"}`, amount: roundMoney(extraCharge) }
        : null,
      {
        label: `${supervisors} supervisor${supervisors === 1 ? "" : "s"} (1 per ${per} drivers)`,
        amount: roundMoney(supervisorCharge)
      }
    ].filter(Boolean)
  };
}

function quoteOnlyResult(serviceType, label) {
  return {
    quoteOnly: true,
    serviceType,
    total: 0,
    basePrice: 0,
    extraHourCharge: 0,
    nightCharge: 0,
    pricingSource: `call-driver:${serviceType}:quote`,
    quoteMessage: label,
    lines: [{ label, amount: 0 }]
  };
}

function normalizeCallDriverInput(input = {}) {
  const serviceType = String(input.serviceType || "").trim().toLowerCase();
  return {
    serviceType,
    vehicleType: vehicleBand(input),
    vehicleModel: String(input.vehicleModel || "").trim(),
    hours: num(input.hours, 0) || null,
    days: num(input.days, 0) || null,
    date: String(input.date || input.travelDate || "").trim(),
    estimatedKm: num(input.estimatedKm || input.distanceKm, 0) || null,
    pickupTime: String(input.pickupTime || "").trim(),
    tripMode: isOneWayTrip(input) ? "one_way" : "return",
    oneWay: isOneWayTrip(input),
    returnDate: String(input.returnDate || "").trim(),
    airport: String(input.airport || "").trim(),
    airportDirection: String(input.airportDirection || "").trim(),
    schoolName: String(input.schoolName || "").trim(),
    schoolShift: String(input.schoolShift || "").trim(),
    workingDays: num(input.workingDays, 0) || null,
    parentContact: String(input.parentContact || "").trim(),
    companyName: String(input.companyName || "").trim(),
    contactPerson: String(input.contactPerson || "").trim(),
    driversRequired: num(input.driversRequired || input.driverCount, 0) || null,
    workingHours: String(input.workingHours || "").trim(),
    notes: String(input.notes || "").trim(),
    eventLocation: String(input.eventLocation || "").trim()
  };
}

function quoteCallDriver(storedTariff, rawInput = {}) {
  const tariff = mergeCallDriverTariff(storedTariff);
  const input = normalizeCallDriverInput(rawInput);
  if (!CALL_DRIVER_SERVICE_TYPES.includes(input.serviceType)) {
    const err = new Error("Select a Call Driver service.");
    err.status = 400;
    throw err;
  }
  if (input.serviceType === "school") {
    return quoteOnlyResult("school", "Monthly pricing – Contact Cabzii / Request a Quote");
  }
  if (input.serviceType === "corporate") {
    return quoteOnlyResult("corporate", "Get Corporate Quote");
  }
  if (input.serviceType === "local") {
    return quoteLocalOrAirport(tariff.local, input, tariff, "local");
  }
  if (input.serviceType === "airport") {
    return quoteLocalOrAirport(tariff.airport, input, tariff, "airport");
  }
  if (input.serviceType === "outstation") {
    return quoteOutstation(tariff, input);
  }
  return quoteValet(tariff, input);
}

function persistableCallDriver(rawInput, quote) {
  const input = normalizeCallDriverInput(rawInput);
  return {
    ...input,
    hours: quote.hours ?? input.hours,
    days: quote.days ?? input.days,
    driversRequired: quote.driversRequired ?? input.driversRequired,
    supervisorCount: quote.supervisorCount || 0,
    quoteRequested: Boolean(quote.quoteOnly),
    opsStatus: "pending",
    quoteSnapshot: {
      total: quote.total,
      lines: quote.lines || [],
      pricingSource: quote.pricingSource || "",
      foodStayNote: quote.foodStayNote || "",
      quoteMessage: quote.quoteMessage || ""
    }
  };
}

module.exports = {
  num,
  isNightPickup,
  inclusiveTripDays,
  quoteCallDriver,
  normalizeCallDriverInput,
  persistableCallDriver
};
