const { User } = require("../models/User");
const { Booking } = require("../models/Booking");

const TZ = "Asia/Kolkata";

function dayKey(date) {
  // YYYY-MM-DD in IST, matching the aggregation's $dateToString output.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

/** Build a zero-filled list of day keys from `days` ago through today (inclusive). */
function buildDateRange(days) {
  const out = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    out.push(dayKey(d));
  }
  return out;
}

/**
 * GET /analytics/overview?days=30
 * Returns KPIs, daily time-series (bookings, revenue, new customers) and
 * status/type breakdowns plus the top customers by spend — everything the
 * admin Reports page needs to render cards and graphs.
 */
async function getOverview(req, res) {
  const days = Math.min(365, Math.max(1, Number.parseInt(String(req.query.days ?? "30"), 10) || 30));
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  const confirmedRevenue = {
    $sum: { $cond: [{ $eq: ["$status", "confirmed"] }, "$amount", 0] }
  };

  const [
    totalCustomers,
    newCustomers,
    totalBookings,
    rangeBookingAgg,
    allRevenueAgg,
    statusAgg,
    typeAgg,
    bookingSeries,
    customerSeries,
    topCustomersAgg
  ] = await Promise.all([
    User.countDocuments({ role: "customer" }),
    User.countDocuments({ role: "customer", createdAt: { $gte: start } }),
    Booking.countDocuments({}),
    Booking.aggregate([
      { $match: { createdAt: { $gte: start } } },
      { $group: { _id: null, count: { $sum: 1 }, revenue: confirmedRevenue } }
    ]),
    Booking.aggregate([{ $group: { _id: null, revenue: confirmedRevenue } }]),
    Booking.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Booking.aggregate([{ $group: { _id: "$type", count: { $sum: 1 } } }]),
    Booking.aggregate([
      { $match: { createdAt: { $gte: start } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: TZ } },
          bookings: { $sum: 1 },
          revenue: confirmedRevenue
        }
      }
    ]),
    User.aggregate([
      { $match: { role: "customer", createdAt: { $gte: start } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: TZ } },
          customers: { $sum: 1 }
        }
      }
    ]),
    Booking.aggregate([
      {
        $group: {
          _id: { phone: "$phone", name: "$customerName" },
          bookings: { $sum: 1 },
          spent: confirmedRevenue
        }
      },
      { $sort: { spent: -1, bookings: -1 } },
      { $limit: 8 }
    ])
  ]);

  const bookingByDay = new Map(bookingSeries.map((d) => [d._id, d]));
  const customerByDay = new Map(customerSeries.map((d) => [d._id, d]));
  const timeseries = buildDateRange(days).map((date) => ({
    date,
    bookings: bookingByDay.get(date)?.bookings || 0,
    revenue: bookingByDay.get(date)?.revenue || 0,
    newCustomers: customerByDay.get(date)?.customers || 0
  }));

  const statusCounts = { pending: 0, confirmed: 0, cancelled: 0 };
  statusAgg.forEach((s) => {
    if (s._id in statusCounts) statusCounts[s._id] = s.count;
  });

  const typeCounts = { cab: 0, driver: 0, tour: 0 };
  typeAgg.forEach((t) => {
    if (t._id in typeCounts) typeCounts[t._id] = t.count;
  });

  res.json({
    success: true,
    data: {
      range: { days, start },
      kpis: {
        totalCustomers,
        newCustomers,
        totalBookings,
        bookingsInRange: rangeBookingAgg[0]?.count || 0,
        revenueInRange: rangeBookingAgg[0]?.revenue || 0,
        totalRevenue: allRevenueAgg[0]?.revenue || 0
      },
      statusCounts,
      typeCounts,
      timeseries,
      topCustomers: topCustomersAgg.map((c) => ({
        phone: c._id.phone,
        name: c._id.name || "",
        bookings: c.bookings,
        spent: c.spent
      }))
    }
  });
}

module.exports = { getOverview };
