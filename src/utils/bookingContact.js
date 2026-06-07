"use strict";

const { Cab } = require("../models/Cab");
const { Driver } = require("../models/Driver");
const { Package } = require("../models/Package");
const { Vendor } = require("../models/Vendor");
const { SiteSettings } = require("../models/SiteSettings");
const { mergeSiteSettings } = require("../config/siteSettingsDefaults");

function normalizeContact(input = {}) {
  return {
    name: String(input.name || "").trim(),
    phone: String(input.phone || "").trim(),
    whatsapp: String(input.whatsapp || input.phone || "").trim(),
    email: String(input.email || "").trim(),
    notes: String(input.notes || "").trim()
  };
}

function hasContactDetails(contact) {
  const c = normalizeContact(contact);
  return Boolean(c.phone || c.whatsapp || c.name);
}

async function resolveVendorContactForBooking(booking) {
  const type = booking?.type;
  const itemId = booking?.itemId;
  if (!type || !itemId) return normalizeContact({});

  const models = { cab: Cab, driver: Driver, tour: Package };
  const Model = models[type];
  if (!Model) return normalizeContact({});

  const item = await Model.findById(itemId).lean();
  if (!item) return normalizeContact({});

  let name = item.vendor || item.title || item.name || "Cabzii Partner";
  let phone = item.vendorAdminPhone || "";
  let email = "";

  if (item.vendor) {
    const vendor = await Vendor.findOne({ name: item.vendor }).lean();
    if (vendor) {
      phone = phone || vendor.adminPhone || vendor.contactPhone || "";
      email = vendor.contactEmail || "";
      name = `${item.vendor}${phone ? "" : ""}`.trim();
    }
  }

  if (!phone) {
    try {
      const settingsDoc = await SiteSettings.findOne({ key: "main" }).lean();
      const settings = mergeSiteSettings(settingsDoc || {});
      phone = settings?.contact?.whatsapp || settings?.contact?.phone || "";
      if (!email) email = settings?.contact?.email || "";
    } catch {
      /* ignore */
    }
  }

  if (type === "driver" && item.name) {
    name = `${item.name} · ${item.vendor || "Driver"}`.trim();
  } else if (type === "cab" && item.title) {
    name = `${item.vendor || "Partner"} · ${item.title}`.trim();
  }

  return normalizeContact({ name, phone, whatsapp: phone, email });
}

function mergeVendorContact(existing, incoming) {
  const base = normalizeContact(existing);
  const next = normalizeContact(incoming);
  return {
    name: next.name || base.name,
    phone: next.phone || base.phone,
    whatsapp: next.whatsapp || next.phone || base.whatsapp || base.phone,
    email: next.email || base.email,
    notes: next.notes || base.notes
  };
}

function sanitizeBookingForViewer(booking, { isAdmin = false } = {}) {
  if (!booking) return booking;
  const doc = { ...booking };
  const showContact = isAdmin || doc.status === "confirmed";
  if (!showContact) {
    doc.vendorContact = undefined;
    delete doc.vendorContact;
  } else if (doc.status === "finished" && !isAdmin) {
    doc.vendorContact = undefined;
    delete doc.vendorContact;
  }
  return doc;
}

async function enrichBookingForDisplay(booking, { isAdmin = false } = {}) {
  if (!booking) return booking;
  const doc = { ...booking };
  const needsContact =
    (isAdmin || doc.status === "confirmed") && doc.status !== "finished" && !hasContactDetails(doc.vendorContact);
  if (needsContact) {
    doc.vendorContact = await resolveVendorContactForBooking(doc);
  }
  return sanitizeBookingForViewer(doc, { isAdmin });
}

module.exports = {
  normalizeContact,
  hasContactDetails,
  resolveVendorContactForBooking,
  mergeVendorContact,
  sanitizeBookingForViewer,
  enrichBookingForDisplay
};
