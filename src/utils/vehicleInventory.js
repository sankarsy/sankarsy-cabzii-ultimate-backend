"use strict";

const { HttpError } = require("./httpError");
const { isSuperAdminUser } = require("./adminAccess");

const VEHICLE_STATUSES = [
  "active",
  "inactive",
  "draft",
  "under_verification",
  "maintenance",
  "suspended"
];

const AVAILABILITY_STATUSES = ["available", "busy", "blocked", "offline"];

const DOCUMENT_TYPES = ["rc", "insurance", "permit", "fitness", "other"];
const DOCUMENT_STATUSES = ["pending", "verified", "rejected"];
const VERIFICATION_STATUSES = ["pending", "approved", "rejected"];

const VENDOR_STATUSES = ["active", "inactive", "draft", "under_verification", "maintenance"];
const VENDOR_AVAILABILITY = ["available", "blocked", "offline"];

const PUBLIC_VEHICLE_STATUSES = new Set(["active"]);

function normalizeRegistrationNumber(raw) {
  const compact = String(raw || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  return compact;
}

function emptyToUndefined(value) {
  const n = normalizeRegistrationNumber(value);
  return n || undefined;
}

function isPublicVehicleStatus(status) {
  return !status || PUBLIC_VEHICLE_STATUSES.has(String(status));
}

function sanitizeInventoryPayload(req, payload, existing = null) {
  const next = { ...payload };
  delete next.vendorId;

  if (next.registrationNumber != null) {
    const normalized = normalizeRegistrationNumber(next.registrationNumber);
    next.registrationNumber = normalized || "";
  }

  if (Array.isArray(next.blockedDates)) {
    next.blockedDates = next.blockedDates
      .map((d) => String(d || "").trim())
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
  }

  if (Array.isArray(next.vehicleDocuments)) {
    next.vehicleDocuments = next.vehicleDocuments
      .filter((doc) => doc && String(doc.url || "").trim())
      .map((doc) => ({
        docType: DOCUMENT_TYPES.includes(doc.docType) ? doc.docType : "other",
        url: String(doc.url || "").trim(),
        status: DOCUMENT_STATUSES.includes(doc.status) ? doc.status : "pending",
        expiresAt: String(doc.expiresAt || "").trim(),
        label: String(doc.label || "").trim()
      }));
  }

  if (isSuperAdminUser(req) || req.user?.role !== "vendor_admin") {
    return next;
  }

  delete next.verificationStatus;
  if (existing?.verificationStatus) next.verificationStatus = existing.verificationStatus;

  if (next.status && !VENDOR_STATUSES.includes(next.status)) {
    throw new HttpError(403, "Vendors cannot set that vehicle status.");
  }

  if (next.availabilityStatus === "busy") {
    next.availabilityStatus = existing?.availabilityStatus || "available";
  }
  if (next.availabilityStatus && !VENDOR_AVAILABILITY.includes(next.availabilityStatus)) {
    throw new HttpError(403, "Vendors cannot set that availability.");
  }

  if (Array.isArray(next.vehicleDocuments) && Array.isArray(existing?.vehicleDocuments)) {
    const prevByUrl = new Map(
      existing.vehicleDocuments.map((d) => [String(d.url || ""), d.status || "pending"])
    );
    next.vehicleDocuments = next.vehicleDocuments.map((doc) => ({
      ...doc,
      status: prevByUrl.get(doc.url) === "verified" && doc.status !== "rejected" ? "verified" : "pending"
    }));
  }

  return next;
}

async function assertUniqueRegistration(Cab, registrationNumber, excludeId) {
  const plate = normalizeRegistrationNumber(registrationNumber);
  if (!plate) return;
  const query = {
    registrationNumber: plate,
    isDeleted: { $ne: true }
  };
  if (excludeId) query._id = { $ne: excludeId };
  const clash = await Cab.findOne(query).select("_id vendor title registrationNumber").lean();
  if (clash) {
    throw new HttpError(409, "This registration number is already on another Cabzii vehicle.");
  }
}

module.exports = {
  VEHICLE_STATUSES,
  AVAILABILITY_STATUSES,
  DOCUMENT_TYPES,
  DOCUMENT_STATUSES,
  VERIFICATION_STATUSES,
  VENDOR_STATUSES,
  VENDOR_AVAILABILITY,
  normalizeRegistrationNumber,
  emptyToUndefined,
  isPublicVehicleStatus,
  sanitizeInventoryPayload,
  assertUniqueRegistration
};
