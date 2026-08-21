"use strict";

/**
 * Wave 1.1 ownership dry-run. READ ONLY — never writes to MongoDB.
 * Usage: node scripts/ownershipDryRun.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const path = require("path");
const { env } = require(path.join(__dirname, "..", "src", "config", "env"));
const { Booking } = require(path.join(__dirname, "..", "src", "models", "Booking"));
const { Cab } = require(path.join(__dirname, "..", "src", "models", "Cab"));
const { Driver } = require(path.join(__dirname, "..", "src", "models", "Driver"));
const { Package } = require(path.join(__dirname, "..", "src", "models", "Package"));
const { BusTrip } = require(path.join(__dirname, "..", "src", "models", "BusTrip"));
const { Vendor } = require(path.join(__dirname, "..", "src", "models", "Vendor"));
const { User } = require(path.join(__dirname, "..", "src", "models", "User"));
const {
  classifyBookingOwnership,
  classifyCatalogOwnership,
  indexVendorAccounts,
  isGenericVendorName
} = require(path.join(__dirname, "..", "src", "utils", "vendorOwnership"));

function countBy(rows, key) {
  return rows.reduce((acc, row) => {
    const k = row[key] || "unknown";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
}

async function main() {
  if (!env.mongodbUri) throw new Error("MONGODB_URI missing");
  await mongoose.connect(env.mongodbUri);

  const [bookings, cabs, drivers, packages, buses, vendors, vendorUsers] = await Promise.all([
    Booking.find({}).lean(),
    Cab.find({}).select("_id title vendor vendorAdminPhone").lean(),
    Driver.find({}).select("_id name vendor vendorAdminPhone").lean(),
    Package.find({}).select("_id name vendor vendorAdminPhone").lean(),
    BusTrip.find({}).select("_id operator vendor vendorAdminPhone status").lean(),
    Vendor.find({}).select("name adminPhone isActive").lean(),
    User.find({ role: "vendor_admin" }).select("mobileNumber name").lean()
  ]);

  const accounts = indexVendorAccounts(
    vendors,
    vendorUsers.map((u) => ({ ...u, vendorName: vendors.find((v) => v.adminPhone === u.mobileNumber)?.name }))
  );

  const catalogById = new Map();
  for (const row of [...cabs, ...drivers, ...packages, ...buses]) {
    catalogById.set(String(row._id), row);
  }

  const bookingRows = bookings.map((booking) => {
    const relatedId = booking.itemId ? String(booking.itemId) : String(booking.busMeta?.tripId || "");
    const catalog = relatedId ? catalogById.get(relatedId) : null;
    return classifyBookingOwnership(booking, catalog, accounts);
  });

  const busRows = buses.map((trip) => {
    const classified = classifyCatalogOwnership(trip, accounts);
    return {
      tripId: String(trip._id),
      operator: trip.operator || "",
      currentVendor: trip.vendor || "",
      currentVendorAdminPhone: trip.vendorAdminPhone || "",
      proposedVendor: classified.proposedVendor,
      proposedVendorAdminPhone: classified.proposedVendorAdminPhone,
      reason: classified.reason,
      status: classified.status
    };
  });

  const report = {
    dryRun: true,
    wroteToMongo: false,
    vendorsIndexed: vendors.map((v) => ({ name: v.name, hasAdminPhone: Boolean(v.adminPhone) })),
    bookings: {
      total: bookingRows.length,
      byStatus: countBy(bookingRows, "status"),
      rows: bookingRows
    },
    buses: {
      total: busRows.length,
      withVendorAdminPhone: busRows.filter((r) => r.currentVendorAdminPhone).length,
      withoutVendorAdminPhone: busRows.filter((r) => !r.currentVendorAdminPhone).length,
      exactVendorNameMatches: busRows.filter((r) => r.status === "MATCHED").length,
      ambiguousGenericVendorNames: busRows.filter(
        (r) => r.status === "AMBIGUOUS" || isGenericVendorName(r.currentVendor)
      ).length,
      unmatched: busRows.filter((r) => r.status === "UNMATCHED").length,
      byStatus: countBy(busRows, "status"),
      rows: busRows
    },
    totals: {
      safeAutomaticMatches: bookingRows.filter((r) => r.status === "MATCHED").length,
      ambiguousRecords: bookingRows.filter((r) => r.status === "AMBIGUOUS").length + busRows.filter((r) => r.status === "AMBIGUOUS").length,
      unmatchedRecords: bookingRows.filter((r) => r.status === "UNMATCHED").length + busRows.filter((r) => r.status === "UNMATCHED").length
    }
  };

  await mongoose.disconnect();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
