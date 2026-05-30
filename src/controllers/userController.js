const mongoose = require("mongoose");
const { User } = require("../models/User");
const { Booking } = require("../models/Booking");
const { HttpError } = require("../utils/httpError");

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Build a $match clause that links bookings to a set of users by id OR phone. */
function bookingMatchFor(ids, phones) {
  const or = [];
  if (ids.length) or.push({ user: { $in: ids } });
  if (phones.length) or.push({ phone: { $in: phones } });
  return or.length ? { $or: or } : { _id: null };
}

/**
 * GET /users — paginated customer directory with aggregated booking stats.
 * Query: page, limit, q (mobile/name/email), role (default "customer", "all" for everyone).
 */
async function listCustomers(req, res) {
  const page = Math.max(1, Number.parseInt(String(req.query.page ?? "1"), 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(String(req.query.limit ?? "20"), 10) || 20));
  const q = (req.query.q ?? "").trim();
  const roleParam = (req.query.role ?? "customer").trim();

  const filter = {};
  if (roleParam && roleParam !== "all") filter.role = roleParam;
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ mobileNumber: rx }, { name: rx }, { email: rx }];
  }

  const skip = (page - 1) * limit;
  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(filter)
  ]);

  const ids = users.map((u) => u._id);
  const phones = users.map((u) => u.mobileNumber).filter(Boolean);

  const stats = users.length
    ? await Booking.aggregate([
        { $match: bookingMatchFor(ids, phones) },
        {
          $group: {
            _id: "$phone",
            bookings: { $sum: 1 },
            spent: { $sum: { $cond: [{ $eq: ["$status", "confirmed"] }, "$amount", 0] } },
            lastBookingAt: { $max: "$createdAt" }
          }
        }
      ])
    : [];

  const statsByPhone = new Map(stats.map((s) => [s._id, s]));

  const data = users.map((u) => {
    const s = statsByPhone.get(u.mobileNumber) || {};
    return {
      _id: u._id,
      mobileNumber: u.mobileNumber,
      name: u.name || "",
      email: u.email || "",
      role: u.role,
      isBlocked: Boolean(u.isBlocked),
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt || null,
      loginCount: u.loginCount || 0,
      bookingsCount: s.bookings || 0,
      totalSpent: s.spent || 0,
      lastBookingAt: s.lastBookingAt || null
    };
  });

  res.json({
    success: true,
    data,
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }
  });
}

/** GET /users/:id — single customer profile with their full booking history. */
async function getCustomer(req, res) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new HttpError(400, "Invalid customer id");

  const user = await User.findById(id).lean();
  if (!user) throw new HttpError(404, "Customer not found");

  const match = bookingMatchFor([user._id], user.mobileNumber ? [user.mobileNumber] : []);
  const bookings = await Booking.find(match).sort({ createdAt: -1 }).lean();

  const totalSpent = bookings
    .filter((b) => b.status === "confirmed")
    .reduce((sum, b) => sum + (b.amount || 0), 0);

  res.json({
    success: true,
    data: {
      customer: {
        _id: user._id,
        mobileNumber: user.mobileNumber,
        name: user.name || "",
        email: user.email || "",
        role: user.role,
        isBlocked: Boolean(user.isBlocked),
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt || null,
        loginCount: user.loginCount || 0
      },
      stats: {
        bookingsCount: bookings.length,
        confirmed: bookings.filter((b) => b.status === "confirmed").length,
        pending: bookings.filter((b) => b.status === "pending").length,
        cancelled: bookings.filter((b) => b.status === "cancelled").length,
        totalSpent
      },
      bookings
    }
  });
}

module.exports = { listCustomers, getCustomer };
