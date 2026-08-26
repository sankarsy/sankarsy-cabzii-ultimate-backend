"use strict";

/**
 * Batch 6 inventory QA against the live Cab collection.
 * READ ONLY — never writes.
 * Usage: node scripts/qaVehicleInventory.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const path = require("path");
const { env } = require(path.join(__dirname, "..", "src", "config", "env"));
const { Cab } = require(path.join(__dirname, "..", "src", "models", "Cab"));
const {
  normalizeRegistrationNumber,
  sanitizeInventoryPayload,
  assertUniqueRegistration,
  isPublicVehicleStatus
} = require(path.join(__dirname, "..", "src", "utils", "vehicleInventory"));
const { listFilterForVendor } = require(path.join(__dirname, "..", "src", "utils", "vendorAccess"));
const { activeCatalogFilter } = require(path.join(__dirname, "..", "src", "utils", "listQuery"));

function maskPhone(phone) {
  const s = String(phone || "");
  if (s.length < 4) return "****";
  return `${"*".repeat(Math.max(0, s.length - 4))}${s.slice(-4)}`;
}

function maskPlate(plate) {
  const s = String(plate || "");
  if (!s) return "";
  if (s.length <= 4) return "****";
  return `${s.slice(0, 2)}****${s.slice(-2)}`;
}

async function main() {
  if (!env.mongodbUri) throw new Error("MONGODB_URI missing");
  await mongoose.connect(env.mongodbUri);

  const failures = [];
  const cabs = await Cab.find({ isDeleted: { $ne: true } })
    .select("title vehicleName vendor vendorAdminPhone city category type status availabilityStatus registrationNumber verificationStatus")
    .lean();

  const publicFilter = activeCatalogFilter();
  const publicCount = await Cab.countDocuments(publicFilter);
  const activeStatusCount = cabs.filter((c) => isPublicVehicleStatus(c.status)).length;

  const byPhone = new Map();
  for (const cab of cabs) {
    const phone = String(cab.vendorAdminPhone || "").trim() || "(unstamped)";
    if (!byPhone.has(phone)) byPhone.set(phone, []);
    byPhone.get(phone).push(cab);
  }

  const plateMap = new Map();
  for (const cab of cabs) {
    const plate = normalizeRegistrationNumber(cab.registrationNumber);
    if (!plate) continue;
    if (!plateMap.has(plate)) plateMap.set(plate, []);
    plateMap.get(plate).push(cab);
  }
  const duplicatePlates = [...plateMap.entries()].filter(([, rows]) => rows.length > 1);
  if (duplicatePlates.length) {
    failures.push(`duplicate registrationNumber rows: ${duplicatePlates.length}`);
  }

  const vendorPhones = [...byPhone.keys()].filter((p) => p !== "(unstamped)" && p.length >= 10);
  for (const phone of vendorPhones) {
    const req = { user: { role: "vendor_admin", mobileNumber: phone } };
    const scope = listFilterForVendor(req);
    const visible = await Cab.countDocuments({ ...scope, isDeleted: { $ne: true } });
    const own = byPhone.get(phone).length;
    if (visible !== own) failures.push(`isolation mismatch for ${maskPhone(phone)}: visible ${visible} vs own ${own}`);

    const scoped = await Cab.find({ ...scope, isDeleted: { $ne: true } })
      .select("vendorAdminPhone")
      .lean();
    if (scoped.some((row) => String(row.vendorAdminPhone || "") !== phone)) {
      failures.push(`scope leak for ${maskPhone(phone)}`);
    }
  }

  const plated = cabs.find((c) => normalizeRegistrationNumber(c.registrationNumber));
  if (plated) {
    try {
      await assertUniqueRegistration(Cab, plated.registrationNumber, "000000000000000000000000");
      failures.push("uniqueness helper did not reject an existing live plate");
    } catch (err) {
      if (!/already on another Cabzii vehicle/.test(err.message)) {
        failures.push(`uniqueness helper threw unexpected: ${err.message}`);
      }
    }
  }

  const vendorReq = { user: { role: "vendor_admin" } };
  try {
    sanitizeInventoryPayload(vendorReq, { status: "suspended" }, {});
    failures.push("vendor was allowed to set suspended");
  } catch (err) {
    if (!/cannot set that vehicle status/.test(err.message)) failures.push(err.message);
  }

  const busyKept = sanitizeInventoryPayload(
    vendorReq,
    { availabilityStatus: "busy" },
    { availabilityStatus: "available" }
  );
  if (busyKept.availabilityStatus !== "available") failures.push("vendor was allowed to set busy");

  const stripped = sanitizeInventoryPayload(
    vendorReq,
    { vendorId: "9000000002", verificationStatus: "approved" },
    { verificationStatus: "pending" }
  );
  if (stripped.vendorId) failures.push("vendorId from body was kept");
  if (stripped.verificationStatus !== "pending") failures.push("vendor overwrote verificationStatus");

  console.log("Batch 6 inventory QA (read-only)");
  console.log(`cabs (not deleted): ${cabs.length}`);
  console.log(`public catalog (status active or missing): ${publicCount}`);
  console.log(`in-memory public status count: ${activeStatusCount}`);
  console.log(`vendors with stamped phone: ${vendorPhones.length}`);
  console.log(`unstamped cabs: ${(byPhone.get("(unstamped)") || []).length}`);
  console.log(`plates filled: ${plateMap.size}`);
  console.log(`duplicate plates: ${duplicatePlates.length}`);
  console.log("vendor fleets:");
  for (const [phone, rows] of byPhone) {
    const label = phone === "(unstamped)" ? phone : maskPhone(phone);
    const sample = rows
      .slice(0, 8)
      .map((c) => `${c.vehicleName || c.title || "Cab"} [${c.city || "-"} ${c.status || "active"} ${maskPlate(c.registrationNumber) || "no-plate"}]`)
      .join("; ");
    console.log(`  ${label}: ${rows.length} — ${sample}`);
  }

  await mongoose.disconnect();
  if (failures.length) {
    console.error("FAIL");
    for (const f of failures) console.error(` - ${f}`);
    process.exit(1);
  }
  console.log("PASS");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
