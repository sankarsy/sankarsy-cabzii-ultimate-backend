"use strict";

const mongoose = require("mongoose");
const { Cab } = require("../models/Cab");
const { Driver } = require("../models/Driver");
const { Package } = require("../models/Package");
const { BusTrip } = require("../models/BusTrip");
const { vendorOrScope } = require("./vendorAccess");
const { normalizeMobileNumber } = require("./mobile");

function isVendorAdmin(req) {
  return req.user?.role === "vendor_admin";
}

function denyAllQuery() {
  return { _id: new mongoose.Types.ObjectId("000000000000000000000000") };
}

function composeVendorBookingQuery({ mobile, itemIds = [], tripIds = [] }) {
  const or = [];
  if (mobile) or.push({ vendorAdminPhone: mobile });
  if (itemIds.length) or.push({ itemId: { $in: itemIds } });
  if (tripIds.length) or.push({ "busMeta.tripId": { $in: tripIds } });
  if (!or.length) return denyAllQuery();
  return { $or: or };
}

async function ownedCatalogIds(req) {
  const scope = vendorOrScope(req);
  if (!scope) return { itemIds: [], tripIds: [] };

  const [cabs, drivers, packages, buses] = await Promise.all([
    Cab.find(scope).select("_id").lean(),
    Driver.find(scope).select("_id").lean(),
    Package.find(scope).select("_id").lean(),
    BusTrip.find(scope).select("_id").lean()
  ]);

  const itemIds = [...cabs, ...drivers, ...packages, ...buses].map((d) => d._id);
  const tripIds = buses.map((d) => String(d._id));
  return { itemIds, tripIds };
}

async function buildVendorBookingQuery(req) {
  if (!isVendorAdmin(req)) return null;

  const mobile = normalizeMobileNumber(req.user.mobileNumber);
  const { itemIds, tripIds } = await ownedCatalogIds(req);
  return composeVendorBookingQuery({ mobile, itemIds, tripIds });
}

module.exports = {
  isVendorAdmin,
  composeVendorBookingQuery,
  buildVendorBookingQuery,
  ownedCatalogIds
};
