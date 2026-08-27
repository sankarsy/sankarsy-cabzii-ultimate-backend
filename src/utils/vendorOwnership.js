"use strict";

const { env } = require("../config/env");
const { Vendor } = require("../models/Vendor");
const { normalizeMobileNumber } = require("./mobile");
const { vendorOwningAdminPhone } = require("./vendorPhone");

/** Names that must never be treated as an automatic vendor match. */
const GENERIC_VENDOR_NAMES = new Set(["cabzii partner", "cabzii"]);

function isBlank(value) {
  return !String(value || "").trim();
}

function isGenericVendorName(name) {
  const n = String(name || "")
    .trim()
    .toLowerCase();
  return GENERIC_VENDOR_NAMES.has(n);
}

function exactVendorName(name) {
  return String(name || "").trim();
}

function hasValidAdminPhone(phone) {
  return Boolean(normalizeMobileNumber(phone));
}

/**
 * Classify catalog ownership. Never fuzzy-matches. Never assigns generic names.
 * accounts = { byPhone: Map<phone, account[]>, byName: Map<exactName, account[]> }
 * account = { name, adminPhone, source }
 */
function classifyCatalogOwnership(catalog = {}, accounts = { byPhone: new Map(), byName: new Map() }) {
  const catalogVendor = exactVendorName(catalog.vendor);
  const catalogPhone = normalizeMobileNumber(catalog.vendorAdminPhone);

  if (catalogPhone) {
    const hits = accounts.byPhone.get(catalogPhone) || [];
    if (hits.length === 1) {
      const account = hits[0];
      return {
        status: "MATCHED",
        proposedVendor: account.name || catalogVendor || "",
        proposedVendorAdminPhone: catalogPhone,
        reason: "Rule A: catalog vendorAdminPhone maps to exactly one Vendor/admin account"
      };
    }
    if (hits.length > 1) {
      return {
        status: "AMBIGUOUS",
        proposedVendor: "",
        proposedVendorAdminPhone: "",
        reason: `Rule A: catalog vendorAdminPhone maps to ${hits.length} accounts`
      };
    }
    return {
      status: "UNMATCHED",
      proposedVendor: "",
      proposedVendorAdminPhone: "",
      reason: "Rule A: catalog has vendorAdminPhone but it maps to no Vendor/admin account"
    };
  }

  if (isGenericVendorName(catalogVendor)) {
    return {
      status: "AMBIGUOUS",
      proposedVendor: "",
      proposedVendorAdminPhone: "",
      reason: `Generic vendor name "${catalogVendor}" is not assigned automatically`
    };
  }

  if (!catalogVendor) {
    return {
      status: "UNMATCHED",
      proposedVendor: "",
      proposedVendorAdminPhone: "",
      reason: "No catalog vendorAdminPhone or vendor name"
    };
  }

  const nameHits = accounts.byName.get(catalogVendor) || [];
  if (nameHits.length > 1) {
    return {
      status: "AMBIGUOUS",
      proposedVendor: "",
      proposedVendorAdminPhone: "",
      reason: `Rule B: vendor name "${catalogVendor}" matches ${nameHits.length} Vendor records`
    };
  }
  if (nameHits.length === 1) {
    const account = nameHits[0];
    if (!hasValidAdminPhone(account.adminPhone)) {
      return {
        status: "UNMATCHED",
        proposedVendor: "",
        proposedVendorAdminPhone: "",
        reason: `Rule B: exact vendor name "${catalogVendor}" matches a Vendor without adminPhone`
      };
    }
    return {
      status: "MATCHED",
      proposedVendor: account.name,
      proposedVendorAdminPhone: normalizeMobileNumber(account.adminPhone),
      reason: `Rule B: exact vendor name "${catalogVendor}" matches exactly one Vendor with adminPhone`
    };
  }

  return {
    status: "UNMATCHED",
    proposedVendor: "",
    proposedVendorAdminPhone: "",
    reason: catalogVendor
      ? `No exact Vendor record named "${catalogVendor}" with adminPhone`
      : "No catalog vendorAdminPhone or vendor name"
  };
}

function classifyBookingOwnership(booking, catalogItem, accounts) {
  const catalog = catalogItem || {};
  const classified = classifyCatalogOwnership(catalog, accounts);
  return {
    bookingId: booking._id ? String(booking._id) : "",
    itemId: booking.itemId ? String(booking.itemId) : booking.busMeta?.tripId || "",
    bookingType: booking.type || "",
    currentVendor: booking.vendor || "",
    currentVendorAdminPhone: booking.vendorAdminPhone || "",
    relatedCatalogItem: catalog._id ? String(catalog._id) : "",
    catalogVendor: catalog.vendor || catalog.operator || "",
    catalogVendorAdminPhone: catalog.vendorAdminPhone || "",
    proposedVendor: classified.proposedVendor,
    proposedVendorAdminPhone: classified.proposedVendorAdminPhone,
    reason: catalog._id ? classified.reason : "Related catalog item was not found",
    status: catalog._id ? classified.status : "UNMATCHED"
  };
}

function indexVendorAccounts(vendorDocs = [], vendorAdminUsers = []) {
  const byPhone = new Map();
  const byName = new Map();

  function add(account) {
    const phone = normalizeMobileNumber(account.adminPhone);
    const name = exactVendorName(account.name);
    if (phone) {
      const list = byPhone.get(phone) || [];
      const existing = list.find((a) => a.adminPhone === phone);
      if (existing) {
        if (!existing.name && name) existing.name = name;
      } else {
        list.push({ ...account, adminPhone: phone, name: name || account.name || "" });
        byPhone.set(phone, list);
      }
    }
    if (name && !isGenericVendorName(name)) {
      const list = byName.get(name) || [];
      const existing = list.find((a) => exactVendorName(a.name) === name && normalizeMobileNumber(a.adminPhone) === phone);
      if (!existing) {
        list.push({ ...account, adminPhone: phone || account.adminPhone || "", name });
        byName.set(name, list);
      }
    }
  }

  for (const v of vendorDocs) {
    add({ name: v.name, adminPhone: v.adminPhone, source: "Vendor" });
  }
  for (const u of vendorAdminUsers) {
    add({
      name: u.vendorName || u.name || "",
      adminPhone: u.mobileNumber,
      source: "User.vendor_admin"
    });
  }
  return { byPhone, byName };
}

async function findVendorAccountByPhone(rawPhone, { requireActive = true } = {}) {
  const phone = normalizeMobileNumber(rawPhone);
  if (!phone) return null;
  const vendors = await Vendor.find({}).select("name adminPhone isActive").lean();
  const hit = vendorOwningAdminPhone(vendors, phone, null);
  if (!hit) return null;
  if (requireActive && hit.isActive === false) return null;
  return hit;
}

async function resolveAuthenticatedVendor(req) {
  const phone = normalizeMobileNumber(req.user?.mobileNumber);
  if (!phone) return { phone: "", name: "" };

  const fromEnv = env.vendorAdminMap[phone] || "";
  const vendorDoc = await findVendorAccountByPhone(phone, { requireActive: false });
  const name = exactVendorName(vendorDoc?.name || fromEnv || req.user.vendorName || "");
  return { phone, name };
}

/**
 * vendor_admin create/update: ownership comes from the authenticated account only.
 * Browser vendor / vendorAdminPhone / vendorId are ignored.
 */
async function applyAuthenticatedVendorOwnership(req, payload, existing = null) {
  const next = { ...payload };
  delete next.vendorId;
  if (req.user?.role !== "vendor_admin") return next;

  const identity = await resolveAuthenticatedVendor(req);
  next.vendorAdminPhone = identity.phone;
  next.vendor = identity.name || existing?.vendor || "";
  return next;
}

module.exports = {
  GENERIC_VENDOR_NAMES,
  isGenericVendorName,
  classifyCatalogOwnership,
  classifyBookingOwnership,
  indexVendorAccounts,
  resolveAuthenticatedVendor,
  applyAuthenticatedVendorOwnership,
  findVendorAccountByPhone
};
