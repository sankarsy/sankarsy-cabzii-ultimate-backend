"use strict";

const { BusTrip } = require("../models/BusTrip");

const SAMPLE_BUSES = [
  { operator: "Orange Travels", operatorCode: "OT", fromCity: "Chennai", toCity: "Bengaluru", departureTime: "22:00", arrivalTime: "05:30", duration: "7h 30m", durationMin: 450, busType: "Volvo AC Sleeper", seaterPrice: 699, sleeperPrice: 999 },
  { operator: "KPN Travels", operatorCode: "KPN", fromCity: "Chennai", toCity: "Bengaluru", departureTime: "23:00", arrivalTime: "06:15", duration: "7h 15m", durationMin: 435, busType: "AC Sleeper", seaterPrice: 749, sleeperPrice: 1049 },
  { operator: "Parveen Travels", operatorCode: "PT", fromCity: "Chennai", toCity: "Madurai", departureTime: "21:30", arrivalTime: "05:00", duration: "7h 30m", durationMin: 450, busType: "AC Sleeper", seaterPrice: 650, sleeperPrice: 899 },
  { operator: "KPN Travels", operatorCode: "KPN", fromCity: "Chennai", toCity: "Coimbatore", departureTime: "22:15", arrivalTime: "06:15", duration: "8h", durationMin: 480, busType: "AC Seater", seaterPrice: 799, sleeperPrice: 1099 },
  { operator: "VRL Travels", operatorCode: "VRL", fromCity: "Chennai", toCity: "Tirupati", departureTime: "06:00", arrivalTime: "09:30", duration: "3h 30m", durationMin: 210, busType: "AC Seater", seaterPrice: 449, sleeperPrice: 649 },
  { operator: "APS RTC", operatorCode: "APS", fromCity: "Chennai", toCity: "Tirupati", departureTime: "14:00", arrivalTime: "17:45", duration: "3h 45m", durationMin: 225, busType: "AC Seater", seaterPrice: 399, sleeperPrice: 599 },
  { operator: "YBM Travels", operatorCode: "YBM", fromCity: "Chennai", toCity: "Pondicherry", departureTime: "07:00", arrivalTime: "10:00", duration: "3h", durationMin: 180, busType: "AC Seater", seaterPrice: 399, sleeperPrice: 599 },
  { operator: "SRM Travels", operatorCode: "SRM", fromCity: "Chennai", toCity: "Trichy", departureTime: "22:30", arrivalTime: "04:30", duration: "6h", durationMin: 360, busType: "Volvo AC Sleeper", seaterPrice: 599, sleeperPrice: 849 },
  { operator: "Orange Travels", operatorCode: "OT", fromCity: "Chennai", toCity: "Hyderabad", departureTime: "19:30", arrivalTime: "07:00", duration: "11h 30m", durationMin: 690, busType: "Volvo AC Sleeper", seaterPrice: 1099, sleeperPrice: 1499 },
  { operator: "Parveen Travels", operatorCode: "PT", fromCity: "Chennai", toCity: "Salem", departureTime: "23:00", arrivalTime: "04:30", duration: "5h 30m", durationMin: 330, busType: "AC Sleeper", seaterPrice: 549, sleeperPrice: 799 },
  { operator: "SRS Travels", operatorCode: "SRS", fromCity: "Bengaluru", toCity: "Chennai", departureTime: "22:30", arrivalTime: "06:00", duration: "7h 30m", durationMin: 450, busType: "Volvo AC Sleeper", seaterPrice: 729, sleeperPrice: 1029 },
  { operator: "VRL Travels", operatorCode: "VRL", fromCity: "Tirupati", toCity: "Chennai", departureTime: "17:00", arrivalTime: "20:30", duration: "3h 30m", durationMin: 210, busType: "AC Seater", seaterPrice: 449, sleeperPrice: 649 },
  { operator: "KPN Travels", operatorCode: "KPN", fromCity: "Madurai", toCity: "Chennai", departureTime: "21:00", arrivalTime: "04:45", duration: "7h 45m", durationMin: 465, busType: "AC Sleeper", seaterPrice: 679, sleeperPrice: 929 },
  { operator: "YBM Travels", operatorCode: "YBM", fromCity: "Pondicherry", toCity: "Chennai", departureTime: "18:00", arrivalTime: "21:00", duration: "3h", durationMin: 180, busType: "AC Seater", seaterPrice: 399, sleeperPrice: 599 }
];

function toDoc(row) {
  return {
    ...row,
    vendor: "Cabzii Partner",
    lowerBerthPrice: Math.round((row.sleeperPrice || 900) * 1.1),
    upperBerthPrice: Math.round((row.sleeperPrice || 900) * 0.9),
    boardingPoints: [
      { name: `${row.fromCity} CMBT`, time: row.departureTime, landmark: "Main bus terminus" },
      { name: `${row.fromCity} Central`, time: row.departureTime, landmark: "Near railway" }
    ],
    droppingPoints: [{ name: `${row.toCity} Bus Stand`, time: row.arrivalTime, landmark: "City center" }],
    amenities: ["Water bottle", "Charging point", "Blanket"],
    bookedSeats: [],
    rating: 4.3,
    reviewCount: 120,
    status: "active",
    seoTitle: `${row.operator} ${row.fromCity} to ${row.toCity} bus`,
    seoDescription: `Book ${row.operator} bus from ${row.fromCity} to ${row.toCity} on Cabzii.`,
    seo: `${row.fromCity} to ${row.toCity} bus,${row.operator}`
  };
}

/**
 * Insert default Chennai-first bus trips when the collection is empty.
 */
async function seedBusesIfEmpty() {
  const existing = await BusTrip.countDocuments();
  if (existing > 0) {
    return { created: 0, skipped: true, reason: "buses_exist" };
  }

  const inserted = await BusTrip.insertMany(SAMPLE_BUSES.map(toDoc), { ordered: false });
  console.log(`Auto-seeded ${inserted.length} bus trips.`);
  return { created: inserted.length, skipped: false };
}

module.exports = { seedBusesIfEmpty, SAMPLE_BUSES };
