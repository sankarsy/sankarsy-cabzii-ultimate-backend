"use strict";

/**
 * Cabzii published tariff. Packages with null price are not offered.
 * seats = passenger seats (cars display as seats+1; vans/buses as N Seater).
 */
function pkg(type, name, hours, km, price, extraKm, extraHour, sortOrder) {
  if (price == null) return null;
  return {
    packageType: type,
    packageName: name,
    includedHours: hours,
    includedKm: km,
    originalPrice: price,
    price,
    discountPercentage: 0,
    extraKmRate: extraKm,
    extraHourRate: extraHour || 0,
    sortOrder,
    active: true
  };
}

function carPackages({ local4, local8, extraKm, extraHour, outMinKm, outPrice, outExtraKm }) {
  return [
    pkg("local_4hr", "Local 4 Hrs / 40 KM", 4, 40, local4, extraKm, extraHour, 0),
    pkg("local_8hr", "Local 8 Hrs / 80 KM", 8, 80, local8, extraKm, extraHour, 1),
    pkg("one_way", "Outstation — One Way", 0, outMinKm, outPrice, outExtraKm, extraHour, 2),
    pkg("round_trip", "Outstation — Round Trip", 0, outMinKm, outPrice, outExtraKm, extraHour, 3)
  ].filter(Boolean);
}

function vanPackages({ local5, local10, local15, extraKm, extraHour, outMinKm, outPrice, outExtraKm }) {
  return [
    pkg("local_5hr", "Local 5 Hrs / 50 KM", 5, 50, local5, extraKm, extraHour, 0),
    pkg("local_10hr", "Local 10 Hrs / 100 KM", 10, 100, local10, extraKm, extraHour, 1),
    pkg("local_15hr", "Local 15 Hrs / 150 KM", 15, 150, local15, extraKm, extraHour, 2),
    pkg("one_way", "Outstation — One Way", 0, outMinKm, outPrice, outExtraKm, extraHour, 3),
    pkg("round_trip", "Outstation — Round Trip", 0, outMinKm, outPrice, outExtraKm, extraHour, 4)
  ].filter(Boolean);
}

function busPackages({ local10, extraKm, extraHour, outMinKm, outPrice, outExtraKm }) {
  return [
    pkg("local_10hr", "Local 10 Hrs / 100 KM", 10, 100, local10, extraKm, extraHour, 0),
    pkg("one_way", "Outstation — One Way", 0, outMinKm, outPrice, outExtraKm, extraHour, 1),
    pkg("round_trip", "Outstation — Round Trip", 0, outMinKm, outPrice, outExtraKm, extraHour, 2)
  ].filter(Boolean);
}

const TARIFF = [
  {
    key: "swift-dzire-4",
    tokens: ["dzire"],
    seats: 4,
    title: "Swift Dzire Taxi",
    vehicleName: "Swift Dzire",
    brand: "Maruti Suzuki",
    model: "Dzire",
    type: "Sedan",
    category: "Sedan",
    driverAllowance: 600,
    pricePerKm: 15,
    extraHourRate: 220,
    packages: carPackages({
      local4: 1200,
      local8: 2400,
      extraKm: 15,
      extraHour: 220,
      outMinKm: 250,
      outPrice: 3250,
      outExtraKm: 15
    })
  },
  {
    key: "honda-amaze-4",
    tokens: ["amaze"],
    seats: 4,
    title: "Honda Amaze Taxi",
    vehicleName: "Honda Amaze",
    brand: "Honda",
    model: "Amaze",
    type: "Sedan",
    category: "Sedan",
    driverAllowance: 600,
    pricePerKm: 16,
    extraHourRate: 350,
    packages: carPackages({
      local4: 1400,
      local8: 2800,
      extraKm: 16,
      extraHour: 350,
      outMinKm: 250,
      outPrice: 3500,
      outExtraKm: 16
    })
  },
  {
    key: "ertiga-6",
    tokens: ["ertiga"],
    seats: 6,
    title: "Maruti Ertiga / Tour M",
    vehicleName: "Maruti Ertiga",
    brand: "Maruti Suzuki",
    model: "Ertiga",
    type: "MUV",
    category: "MUV",
    driverAllowance: 600,
    pricePerKm: 19,
    extraHourRate: 450,
    packages: carPackages({
      local4: 1800,
      local8: 3600,
      extraKm: 19,
      extraHour: 450,
      outMinKm: 250,
      outPrice: 4500,
      outExtraKm: 19
    })
  },
  {
    key: "kia-carens-7",
    tokens: ["carens"],
    seats: 7,
    title: "Kia Carens Taxi",
    vehicleName: "Kia Carens",
    brand: "Kia",
    model: "Carens",
    type: "MUV",
    category: "MUV",
    driverAllowance: 800,
    pricePerKm: 19,
    extraHourRate: 450,
    packages: carPackages({
      local4: 1800,
      local8: 3600,
      extraKm: 19,
      extraHour: 450,
      outMinKm: 250,
      outPrice: 4500,
      outExtraKm: 19
    })
  },
  {
    key: "innova-6",
    tokens: ["innova"],
    exclude: ["crysta", "hycross"],
    seats: 6,
    title: "Toyota Innova 6+1",
    vehicleName: "Toyota Innova",
    brand: "Toyota",
    model: "Innova",
    variant: "6+1",
    type: "MUV",
    category: "MUV",
    driverAllowance: 600,
    pricePerKm: 19,
    extraHourRate: 450,
    packages: carPackages({
      local4: 1800,
      local8: 3600,
      extraKm: 19,
      extraHour: 450,
      outMinKm: 250,
      outPrice: 4500,
      outExtraKm: 19
    })
  },
  {
    key: "innova-7",
    tokens: ["innova"],
    exclude: ["crysta", "hycross"],
    seats: 7,
    title: "Toyota Innova 7+1",
    vehicleName: "Toyota Innova",
    brand: "Toyota",
    model: "Innova",
    variant: "7+1",
    type: "MUV",
    category: "MUV",
    driverAllowance: 600,
    pricePerKm: 19,
    extraHourRate: 450,
    packages: carPackages({
      local4: 1800,
      local8: 3600,
      extraKm: 19,
      extraHour: 450,
      outMinKm: 250,
      outPrice: 4500,
      outExtraKm: 19
    })
  },
  {
    key: "crysta-6",
    tokens: ["crysta"],
    seats: 6,
    title: "Innova Crysta 6+1",
    vehicleName: "Toyota Innova Crysta",
    brand: "Toyota",
    model: "Innova Crysta",
    variant: "6+1",
    type: "MUV",
    category: "Premium MUV",
    driverAllowance: 800,
    pricePerKm: 22,
    extraHourRate: 500,
    packages: carPackages({
      local4: 2200,
      local8: 4400,
      extraKm: 22,
      extraHour: 500,
      outMinKm: 250,
      outPrice: 5000,
      outExtraKm: 22
    })
  },
  {
    key: "crysta-7",
    tokens: ["crysta"],
    seats: 7,
    title: "Innova Crysta 7+1",
    vehicleName: "Toyota Innova Crysta",
    brand: "Toyota",
    model: "Innova Crysta",
    variant: "7+1",
    type: "MUV",
    category: "Premium MUV",
    driverAllowance: 800,
    pricePerKm: 22,
    extraHourRate: 500,
    packages: carPackages({
      local4: 2200,
      local8: 4400,
      extraKm: 22,
      extraHour: 500,
      outMinKm: 250,
      outPrice: 5000,
      outExtraKm: 22
    })
  },
  {
    key: "hycross-6",
    tokens: ["hycross"],
    seats: 6,
    title: "Toyota Innova Hycross",
    vehicleName: "Toyota Innova Hycross",
    brand: "Toyota",
    model: "Innova Hycross",
    type: "MUV",
    category: "Premium MUV",
    driverAllowance: 800,
    pricePerKm: 28,
    extraHourRate: 600,
    packages: carPackages({
      local4: null,
      local8: 5500,
      extraKm: 28,
      extraHour: 600,
      outMinKm: 250,
      outPrice: 6250,
      outExtraKm: 28
    })
  },
  {
    key: "corolla-altis-4",
    tokens: ["altis", "corolla"],
    seats: 4,
    title: "Toyota Corolla Altis",
    vehicleName: "Toyota Corolla Altis",
    brand: "Toyota",
    model: "Corolla Altis",
    type: "Sedan",
    category: "Premium Sedan",
    driverAllowance: 700,
    pricePerKm: 25,
    extraHourRate: 0,
    packages: carPackages({
      local4: null,
      local8: null,
      extraKm: 25,
      extraHour: 0,
      outMinKm: 250,
      outPrice: 6250,
      outExtraKm: 25
    })
  },
  {
    key: "fortuner-7",
    tokens: ["fortuner"],
    seats: 7,
    title: "Toyota Fortuner",
    vehicleName: "Toyota Fortuner",
    brand: "Toyota",
    model: "Fortuner",
    type: "SUV",
    category: "SUV",
    driverAllowance: 800,
    pricePerKm: 55,
    extraHourRate: 500,
    packages: carPackages({
      local4: 3800,
      local8: 5600,
      extraKm: 55,
      extraHour: 500,
      outMinKm: 250,
      outPrice: 13750,
      outExtraKm: 55
    })
  },
  {
    key: "carnival-7",
    tokens: ["carnival"],
    seats: 7,
    title: "Kia Carnival",
    vehicleName: "Kia Carnival",
    brand: "Kia",
    model: "Carnival",
    type: "MUV",
    category: "Premium MUV",
    driverAllowance: 800,
    pricePerKm: 50,
    extraHourRate: 500,
    packages: carPackages({
      local4: null,
      local8: 5600,
      extraKm: 50,
      extraHour: 500,
      outMinKm: 250,
      outPrice: 12500,
      outExtraKm: 50
    })
  },
  {
    key: "tempo-12",
    tokens: ["tempo"],
    exclude: ["luxury", "tourister"],
    seats: 12,
    title: "Tempo Traveller 12 Seater",
    vehicleName: "Tempo Traveller 12 Seater",
    brand: "Force",
    model: "Tempo Traveller",
    variant: "12 Seater",
    type: "Tempo Traveller",
    category: "Tempo Traveller",
    driverAllowance: 800,
    pricePerKm: 22,
    extraHourRate: 650,
    packages: vanPackages({
      local5: 3000,
      local10: 6000,
      local15: 9000,
      extraKm: 22,
      extraHour: 650,
      outMinKm: 300,
      outPrice: 6600,
      outExtraKm: 22
    })
  },
  {
    key: "tempo-13",
    tokens: ["tempo"],
    exclude: ["luxury", "tourister"],
    seats: 13,
    title: "Tempo Traveller 13 Seater",
    vehicleName: "Tempo Traveller 13 Seater",
    brand: "Force",
    model: "Tempo Traveller",
    variant: "13 Seater",
    type: "Tempo Traveller",
    category: "Tempo Traveller",
    driverAllowance: 800,
    pricePerKm: 22,
    extraHourRate: 650,
    packages: vanPackages({
      local5: 3000,
      local10: 6000,
      local15: 9000,
      extraKm: 22,
      extraHour: 650,
      outMinKm: 300,
      outPrice: 6600,
      outExtraKm: 22
    })
  },
  {
    key: "luxury-tempo-14",
    tokens: ["luxury", "tempo"],
    seats: 14,
    title: "Luxury Tempo 14 Seater",
    vehicleName: "Luxury Tempo Traveller",
    brand: "Force",
    model: "Luxury Tempo",
    variant: "14 Seater",
    type: "Tempo Traveller",
    category: "Tempo Traveller",
    driverAllowance: 800,
    pricePerKm: 25,
    extraHourRate: 650,
    packages: vanPackages({
      local5: 3000,
      local10: 6000,
      local15: 9000,
      extraKm: 25,
      extraHour: 650,
      outMinKm: 300,
      outPrice: 7500,
      outExtraKm: 25
    })
  },
  {
    key: "tempo-18",
    tokens: ["tempo"],
    exclude: ["luxury", "tourister"],
    seats: 18,
    title: "Tempo Traveller 18 Seater",
    vehicleName: "Tempo Traveller 18 Seater",
    brand: "Force",
    model: "Tempo Traveller",
    variant: "18 Seater",
    type: "Tempo Traveller",
    category: "Tempo Traveller",
    driverAllowance: 800,
    pricePerKm: 26,
    extraHourRate: 750,
    packages: vanPackages({
      local5: 4000,
      local10: 8000,
      local15: 12000,
      extraKm: 30,
      extraHour: 750,
      outMinKm: 300,
      outPrice: 7800,
      outExtraKm: 26
    })
  },
  {
    key: "tourister-16",
    tokens: ["tourister"],
    seats: 16,
    title: "Mahindra Tourister 16 Seater",
    vehicleName: "Mahindra Tourister",
    brand: "Mahindra",
    model: "Tourister",
    variant: "16 Seater",
    type: "Tempo Traveller",
    category: "Tempo Traveller",
    driverAllowance: 700,
    pricePerKm: 22,
    extraHourRate: 650,
    packages: vanPackages({
      local5: 3000,
      local10: 6000,
      local15: 9000,
      extraKm: 22,
      extraHour: 650,
      outMinKm: 300,
      outPrice: 6600,
      outExtraKm: 22
    })
  },
  {
    key: "minibus-21",
    tokens: ["mini bus", "minibus"],
    seats: 21,
    title: "21 Seater Mini Bus",
    vehicleName: "21 Seater Mini Bus",
    brand: "Force",
    model: "Mini Bus",
    variant: "21 Seater",
    type: "Mini Bus",
    category: "Mini Bus",
    driverAllowance: 1000,
    pricePerKm: 29,
    extraHourRate: 800,
    packages: busPackages({
      local10: 8500,
      extraKm: 28,
      extraHour: 800,
      outMinKm: 300,
      outPrice: 8700,
      outExtraKm: 29
    })
  },
  {
    key: "minibus-25",
    tokens: ["mini bus", "minibus"],
    seats: 25,
    title: "25 Seater Mini Bus",
    vehicleName: "25 Seater Mini Bus",
    brand: "Force",
    model: "Mini Bus",
    variant: "25 Seater",
    type: "Mini Bus",
    category: "Mini Bus",
    driverAllowance: 1000,
    pricePerKm: 33,
    extraHourRate: 900,
    packages: busPackages({
      local10: 10000,
      extraKm: 32,
      extraHour: 900,
      outMinKm: 300,
      outPrice: 9900,
      outExtraKm: 33
    })
  },
  {
    key: "minibus-30",
    tokens: ["mini bus", "minibus"],
    seats: 30,
    title: "30 Seater Mini Bus",
    vehicleName: "30 Seater Mini Bus",
    brand: "Force",
    model: "Mini Bus",
    variant: "30 Seater",
    type: "Mini Bus",
    category: "Mini Bus",
    driverAllowance: 1000,
    pricePerKm: 55,
    extraHourRate: 0,
    packages: busPackages({
      local10: null,
      extraKm: 55,
      extraHour: 0,
      outMinKm: 300,
      outPrice: 16500,
      outExtraKm: 55
    })
  }
];

function haystack(cab) {
  return `${cab.vehicleName || ""} ${cab.title || ""} ${cab.model || ""} ${cab.brand || ""} ${cab.slug || ""} ${cab.variant || ""} ${cab.vehicleModel || ""}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ");
}

function cabMatchesTariff(cab, row) {
  const hay = haystack(cab);
  if (!(row.tokens || []).every((t) => hay.includes(t))) return false;
  if ((row.exclude || []).some((t) => hay.includes(t))) return false;
  return true;
}

module.exports = { TARIFF, cabMatchesTariff, haystack };
