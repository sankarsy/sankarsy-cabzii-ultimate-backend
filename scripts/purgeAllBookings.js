"use strict";

/**
 * Backup then delete all booking records.
 * Also removes booking-tied reviews, booking audit logs, and CRM leads
 * created from a booking. Does not touch cabs, users, vendors, drivers,
 * packages, OTP, or the booking feature itself.
 *
 * Usage: node scripts/purgeAllBookings.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const { Booking } = require("../src/models/Booking");
const { Review } = require("../src/models/Review");
const { AuditLog } = require("../src/models/AuditLog");
const { CrmLead } = require("../src/models/CrmLead");

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Missing MONGODB_URI");
    process.exit(1);
  }

  let dbName = "cabzii";
  try {
    dbName = decodeURIComponent(new URL(uri).pathname.replace(/^\//, "").split("/")[0] || "") || "cabzii";
  } catch {
    dbName = process.env.MONGODB_DB_NAME || "cabzii";
  }

  await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 20000 });
  console.log("Connected. Purging all booking data.");

  const bookings = await Booking.find({}).lean();
  const reviews = await Review.find({}).lean();
  const auditLogs = await AuditLog.find({ entity: /^booking$/i }).lean();
  const crmFromBookings = await CrmLead.find({ bookingId: { $ne: null } }).lean();

  const backup = {
    at: new Date().toISOString(),
    dbName,
    bookings,
    reviews,
    auditLogs,
    crmLeadsFromBookings: crmFromBookings
  };

  const outDir = path.join(__dirname, "..", "backups");
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(outDir, `bookings-backup-${stamp}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), "utf8");
  console.log(`Backup written: ${backupPath}`);
  console.log(
    JSON.stringify(
      {
        bookingsToDelete: bookings.length,
        reviewsToDelete: reviews.length,
        bookingAuditLogsToDelete: auditLogs.length,
        crmLeadsFromBookingsToDelete: crmFromBookings.length
      },
      null,
      2
    )
  );

  const bookingResult = await Booking.deleteMany({});
  const reviewResult = await Review.deleteMany({});
  const auditResult = await AuditLog.deleteMany({ entity: /^booking$/i });
  const crmResult = await CrmLead.deleteMany({ bookingId: { $ne: null } });

  const remaining = {
    bookings: await Booking.countDocuments(),
    reviews: await Review.countDocuments(),
    bookingAuditLogs: await AuditLog.countDocuments({ entity: /^booking$/i }),
    crmLeadsWithBookingId: await CrmLead.countDocuments({ bookingId: { $ne: null } })
  };

  console.log(
    JSON.stringify(
      {
        deleted: {
          bookings: bookingResult.deletedCount,
          reviews: reviewResult.deletedCount,
          bookingAuditLogs: auditResult.deletedCount,
          crmLeadsFromBookings: crmResult.deletedCount
        },
        remaining
      },
      null,
      2
    )
  );

  await mongoose.disconnect();
  console.log("Done. Booking records are removed. Booking screens and catalogs are unchanged.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
