"use strict";

const { Booking } = require("../models/Booking");
const { User } = require("../models/User");
const { HttpError } = require("../utils/httpError");
const { isSuperAdminUser } = require("../utils/adminAccess");

function dayKey(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function buildDateBuckets(days) {
  const safeDays = Math.min(90, Math.max(1, Number(days) || 30));
  const buckets = [];
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(start.getDate() - (safeDays - 1));
  start.setHours(0, 0, 0, 0);

  for (let i = 0; i < safeDays; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    buckets.push({
      date: dayKey(d),
      label: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      bookings: 0,
      newCustomers: 0,
      revenue: 0
    });
  }
  return { buckets, start, end, safeDays };
}

async function analyticsOverview(req, res) {
  if (!isSuperAdminUser(req)) {
    throw new HttpError(403, "Only super admin can view analytics.");
  }

  const { buckets, start, end, safeDays } = buildDateBuckets(req.query.days);
  const bucketMap = Object.fromEntries(buckets.map((b) => [b.date, b]));

  const [totalCustomers, newCustomers, allBookings, rangeBookings] = await Promise.all([
    User.countDocuments({ role: "customer" }),
    User.countDocuments({ role: "customer", createdAt: { $gte: start, $lte: end } }),
    Booking.find({}).select("amount status type createdAt phone customerName").lean(),
    Booking.find({ createdAt: { $gte: start, $lte: end } })
      .select("amount status type createdAt phone customerName")
      .lean()
  ]);

  const statusCounts = { confirmed: 0, pending: 0, cancelled: 0, finished: 0 };
  const typeCounts = { cab: 0, driver: 0, tour: 0 };
  let totalRevenue = 0;

  for (const booking of allBookings) {
    const status = booking.status || "pending";
    if (statusCounts[status] != null) statusCounts[status] += 1;
    const type = booking.type || "cab";
    if (typeCounts[type] != null) typeCounts[type] += 1;
    if (status === "confirmed" || status === "finished") {
      totalRevenue += Number(booking.amount || 0);
    }
  }

  let bookingsInRange = 0;
  let revenueInRange = 0;

  for (const booking of rangeBookings) {
    bookingsInRange += 1;
    const key = dayKey(booking.createdAt);
    if (bucketMap[key]) {
      bucketMap[key].bookings += 1;
      if (booking.status === "confirmed" || booking.status === "finished") {
        const amount = Number(booking.amount || 0);
        bucketMap[key].revenue += amount;
        revenueInRange += amount;
      }
    }
  }

  const newUsersInRange = await User.find({
    role: "customer",
    createdAt: { $gte: start, $lte: end }
  })
    .select("createdAt")
    .lean();

  for (const user of newUsersInRange) {
    const key = dayKey(user.createdAt);
    if (bucketMap[key]) bucketMap[key].newCustomers += 1;
  }

  const spendByPhone = {};
  for (const booking of allBookings) {
    const phone = String(booking.phone || "").trim();
    if (!phone) continue;
    if (!spendByPhone[phone]) {
      spendByPhone[phone] = {
        phone,
        name: booking.customerName || "Guest",
        bookings: 0,
        spent: 0
      };
    }
    spendByPhone[phone].bookings += 1;
    if (booking.status === "confirmed" || booking.status === "finished") {
      spendByPhone[phone].spent += Number(booking.amount || 0);
    }
    if (booking.customerName && booking.customerName !== "Guest") {
      spendByPhone[phone].name = booking.customerName;
    }
  }

  const topCustomers = Object.values(spendByPhone)
    .sort((a, b) => b.spent - a.spent || b.bookings - a.bookings)
    .slice(0, 10);

  res.json({
    success: true,
    data: {
      kpis: {
        totalCustomers,
        newCustomers,
        totalBookings: allBookings.length,
        bookingsInRange,
        revenueInRange,
        totalRevenue
      },
      statusCounts,
      typeCounts,
      timeseries: buckets,
      topCustomers
    }
  });
}

module.exports = { analyticsOverview };
