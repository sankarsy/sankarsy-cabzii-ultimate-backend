"use strict";

/**
 * Backup then delete unused driver catalog / account rows.
 * Also removes driver-role login users and driver audit logs.
 * Does not touch Call Driver, acting-driver pages, cabs, bookings code, or OTP.
 *
 * Usage: node scripts/purgeAllDrivers.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const { Driver } = require("../src/models/Driver");
const { User } = require("../src/models/User");
const { AuditLog } = require("../src/models/AuditLog");

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
  console.log("Connected. Purging unused driver records.");

  const drivers = await Driver.find({}).lean();
  const driverUsers = await User.find({ role: "driver" }).lean();
  const auditLogs = await AuditLog.find({ entity: /^driver$/i }).lean();

  const backup = {
    at: new Date().toISOString(),
    dbName,
    drivers,
    driverUsers,
    auditLogs
  };

  const outDir = path.join(__dirname, "..", "backups");
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(outDir, `drivers-backup-${stamp}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), "utf8");
  console.log(`Backup written: ${backupPath}`);
  console.log(
    JSON.stringify(
      {
        driversToDelete: drivers.length,
        driverUsersToDelete: driverUsers.length,
        driverAuditLogsToDelete: auditLogs.length
      },
      null,
      2
    )
  );

  const driverResult = await Driver.deleteMany({});
  const userResult = await User.deleteMany({ role: "driver" });
  const auditResult = await AuditLog.deleteMany({ entity: /^driver$/i });

  const remaining = {
    drivers: await Driver.countDocuments(),
    driverUsers: await User.countDocuments({ role: "driver" }),
    driverAuditLogs: await AuditLog.countDocuments({ entity: /^driver$/i })
  };

  console.log(
    JSON.stringify(
      {
        deleted: {
          drivers: driverResult.deletedCount,
          driverUsers: userResult.deletedCount,
          driverAuditLogs: auditResult.deletedCount
        },
        remaining
      },
      null,
      2
    )
  );

  await mongoose.disconnect();
  console.log("Done. Driver catalog/account rows are removed. Call Driver is unchanged.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
