"use strict";

const mongoose = require("mongoose");
const { User } = require("../models/User");
const { Booking } = require("../models/Booking");
const { HttpError } = require("../utils/httpError");
const { isSuperAdminUser } = require("../utils/adminAccess");
const { phoneLookupValues } = require("../utils/bookingQuery");
const { normalizeMobileNumber } = require("../utils/mobile");

const GUEST_ID_PREFIX = "phone:";

function guestCustomerId(phone) {
  const normalized = normalizeMobileNumber(phone);
  return normalized ? `${GUEST_ID_PREFIX}${normalized}` : "";
}

function parseCustomerId(id) {
  const raw = String(id || "").trim();
  if (raw.startsWith(GUEST_ID_PREFIX)) {
    return { type: "phone", phone: raw.slice(GUEST_ID_PREFIX.length) };
  }
  if (mongoose.isValidObjectId(raw)) {
    return { type: "user", userId: raw };
  }
  const asPhone = normalizeMobileNumber(raw);
  if (asPhone) return { type: "phone", phone: asPhone };
  return null;
}

async function bookingStatsForPhone(phone) {
  const phones = phoneLookupValues(phone);
  const query = phones.length ? { phone: { $in: phones } } : { phone };
  const bookings = await Booking.find(query).sort({ createdAt: -1 }).lean();

  let totalSpent = 0;
  let confirmed = 0;
  let name = "";
  let email = "";

  for (const booking of bookings) {
    if (booking.status === "confirmed") confirmed += 1;
    if (booking.status === "confirmed" || booking.status === "finished") {
      totalSpent += Number(booking.amount || 0);
    }
    if (!name && booking.customerName && !/^Guest\s/i.test(booking.customerName)) {
      name = booking.customerName;
    }
    if (!email && booking.email) email = booking.email;
  }

  return {
    bookingsCount: bookings.length,
    confirmed,
    totalSpent,
    name,
    email,
    bookings,
    firstBookingAt: bookings.length ? bookings[bookings.length - 1].createdAt : null,
    lastBookingAt: bookings.length ? bookings[0].createdAt : null
  };
}

async function buildCustomerDirectory() {
  const [users, bookingGroups] = await Promise.all([
    User.find({ role: "customer" }).lean(),
    Booking.aggregate([
      {
        $group: {
          _id: "$phone",
          name: { $last: "$customerName" },
          email: { $last: "$email" },
          bookingsCount: { $sum: 1 },
          totalSpent: {
            $sum: {
              $cond: [{ $in: ["$status", ["confirmed", "finished"]] }, { $ifNull: ["$amount", 0] }, 0]
            }
          },
          firstBookingAt: { $min: "$createdAt" },
          lastBookingAt: { $max: "$createdAt" }
        }
      }
    ])
  ]);

  const byPhone = new Map();

  for (const group of bookingGroups) {
    const phone = normalizeMobileNumber(group._id) || String(group._id || "").trim();
    if (!phone) continue;

    let name = String(group.name || "").trim();
    if (/^Guest\s/i.test(name)) name = "";

    byPhone.set(phone, {
      _id: guestCustomerId(phone),
      mobileNumber: phone,
      name,
      email: String(group.email || "").trim(),
      createdAt: group.firstBookingAt || null,
      lastLoginAt: null,
      loginCount: 0,
      bookingsCount: Number(group.bookingsCount || 0),
      totalSpent: Number(group.totalSpent || 0),
      lastBookingAt: group.lastBookingAt || null,
      registered: false
    });
  }

  for (const user of users) {
    const phone = normalizeMobileNumber(user.mobileNumber) || user.mobileNumber;
    if (!phone) continue;

    const existing = byPhone.get(phone);
    const bookingsCount = existing?.bookingsCount ?? 0;
    const totalSpent = existing?.totalSpent ?? 0;

    const name =
      String(user.name || "").trim() ||
      existing?.name ||
      "";

    byPhone.set(phone, {
      _id: String(user._id),
      mobileNumber: phone,
      name,
      email: String(user.email || "").trim() || existing?.email || "",
      createdAt: user.createdAt || existing?.createdAt || null,
      lastLoginAt: user.lastLoginAt || null,
      loginCount: Number(user.loginCount || 0),
      bookingsCount,
      totalSpent,
      lastBookingAt: existing?.lastBookingAt || null,
      registered: true
    });
  }

  return Array.from(byPhone.values()).sort(
    (a, b) => new Date(b.lastBookingAt || b.createdAt || 0) - new Date(a.lastBookingAt || a.createdAt || 0)
  );
}

function filterCustomers(rows, q) {
  if (!q) return rows;
  const needle = q.toLowerCase();
  return rows.filter((row) => {
    const hay = [row.name, row.mobileNumber, row.email].filter(Boolean).join(" ").toLowerCase();
    return hay.includes(needle);
  });
}

async function listCustomers(req, res) {
  if (!isSuperAdminUser(req)) {
    throw new HttpError(403, "Only super admin can view customers.");
  }

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const q = String(req.query.q || "").trim();

  const allRows = await buildCustomerDirectory();
  const filtered = filterCustomers(allRows, q);
  const total = filtered.length;
  const start = (page - 1) * limit;
  const data = filtered.slice(start, start + limit);

  res.json({
    success: true,
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit))
    }
  });
}

async function getCustomerById(req, res) {
  if (!isSuperAdminUser(req)) {
    throw new HttpError(403, "Only super admin can view customers.");
  }

  const parsed = parseCustomerId(req.params.id);
  if (!parsed) throw new HttpError(400, "Invalid customer id");

  if (parsed.type === "user") {
    const user = await User.findById(parsed.userId).lean();
    if (!user) throw new HttpError(404, "Customer not found");

    const stats = await bookingStatsForPhone(user.mobileNumber);
    const phone = normalizeMobileNumber(user.mobileNumber) || user.mobileNumber;

    return res.json({
      success: true,
      data: {
        customer: {
          _id: String(user._id),
          name: user.name || stats.name || "",
          email: user.email || stats.email || "",
          mobileNumber: phone,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt || null,
          loginCount: Number(user.loginCount || 0),
          registered: user.role === "customer"
        },
        stats: {
          bookingsCount: stats.bookingsCount,
          confirmed: stats.confirmed,
          totalSpent: stats.totalSpent
        },
        bookings: stats.bookings
      }
    });
  }

  const stats = await bookingStatsForPhone(parsed.phone);
  if (!stats.bookings.length) throw new HttpError(404, "Customer not found");

  return res.json({
    success: true,
    data: {
      customer: {
        _id: guestCustomerId(parsed.phone),
        name: stats.name || "",
        email: stats.email || "",
        mobileNumber: parsed.phone,
        createdAt: stats.firstBookingAt,
        lastLoginAt: null,
        loginCount: 0,
        registered: false
      },
      stats: {
        bookingsCount: stats.bookingsCount,
        confirmed: stats.confirmed,
        totalSpent: stats.totalSpent
      },
      bookings: stats.bookings
    }
  });
}

module.exports = {
  listCustomers,
  getCustomerById
};
