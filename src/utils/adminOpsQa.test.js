"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  matchCabs,
  isVendorOwnedCab,
  isCabziiFallbackCab
} = require("../services/vendorMatchingService");
const { listFilterForVendor, docMatchForVendor } = require("./vendorAccess");
const { catalogOwnedByVendor } = require("./bookingAvailability");
const { catalogListFilter, activeCatalogFilter, isCatalogAdmin } = require("./listQuery");
const { normalizeCabForApi } = require("./catalogNormalize");
const { wantsCityMatching, searchCabsForCustomer } = require("./cabSearchMatching");
const { sanitizeInventoryPayload } = require("./vehicleInventory");

const MULTI_PHONE = "8220873545";
const OTHER_PHONE = "9000000002";

function cab(overrides) {
  return {
    _id: "cab-default",
    title: "Dzire",
    vendor: "MULTI TRAVELS",
    vendorAdminPhone: MULTI_PHONE,
    city: "Chennai",
    location: "Chennai",
    serviceAreas: ["Chennai", "Tambaram"],
    pickupLocations: ["Chennai Airport"],
    status: "active",
    availabilityStatus: "available",
    verificationStatus: "approved",
    category: "Sedan",
    type: "Sedan",
    seats: 4,
    isDeleted: false,
    registrationNumber: "TN01AB1111",
    ...overrides
  };
}

const multiChennai = cab({ _id: "multi-chennai" });
const otherMadurai = cab({
  _id: "other-madurai",
  vendor: "Madurai Cabs",
  vendorAdminPhone: OTHER_PHONE,
  city: "Madurai",
  location: "Madurai",
  serviceAreas: ["Madurai"],
  pickupLocations: ["Madurai Airport"],
  category: "SUV",
  type: "SUV",
  seats: 6,
  registrationNumber: "TN58CD2222"
});
const cabziiChennai = cab({
  _id: "cabzii-chennai",
  vendor: "Cabzii Partner",
  vendorAdminPhone: "",
  registrationNumber: "TN00CZ0001"
});

const inventory = [multiChennai, otherMadurai, cabziiChennai];

function applyMongoFilter(docs, filter) {
  return docs.filter((doc) => {
    if (filter._id != null && String(doc._id) !== String(filter._id)) return false;
    if (filter.vendorAdminPhone != null && doc.vendorAdminPhone !== filter.vendorAdminPhone) return false;
    return true;
  });
}

describe("Phase 3 — 1 admin can read operational Cab fields", () => {
  it("admin serialization keeps plate, city, service areas, seats, status, availability, verification, vendor", () => {
    const admin = normalizeCabForApi(
      cab({
        verificationStatus: "pending",
        serviceAreas: ["Chennai", "Vellore"],
        pickupLocations: ["Chennai Airport"]
      }),
      { includeRegistration: true }
    );
    assert.equal(admin.registrationNumber, "TN01AB1111");
    assert.equal(admin.category, "Sedan");
    assert.equal(admin.type, "Sedan");
    assert.equal(admin.seats, 4);
    assert.equal(admin.city, "Chennai");
    assert.deepEqual(admin.serviceAreas, ["Chennai", "Vellore"]);
    assert.deepEqual(admin.pickupLocations, ["Chennai Airport"]);
    assert.equal(admin.status, "active");
    assert.equal(admin.availabilityStatus, "available");
    assert.equal(admin.verificationStatus, "pending");
    assert.equal(admin.vendor, "MULTI TRAVELS");
    assert.equal(admin.vendorAdminPhone, MULTI_PHONE);
    assert.equal(isCatalogAdmin({ user: { role: "super_admin" } }), true);
    assert.equal(isCatalogAdmin({ user: { role: "vendor_admin" } }), true);
    assert.ok(!isCatalogAdmin({ user: null }));
    assert.ok(!isCatalogAdmin({}));
  });
});

describe("Phase 3 — 2 vendor sees only own inventory", () => {
  it("MULTI TRAVELS list is phone-scoped and excludes other vendors and Cabzii", () => {
    const multiReq = { user: { role: "vendor_admin", mobileNumber: MULTI_PHONE } };
    const otherReq = { user: { role: "vendor_admin", mobileNumber: OTHER_PHONE } };
    const superReq = { user: { role: "super_admin" } };

    const multiFilter = listFilterForVendor(multiReq);
    const otherFilter = listFilterForVendor(otherReq);
    const superFilter = listFilterForVendor(superReq);

    assert.deepEqual(multiFilter, { vendorAdminPhone: MULTI_PHONE });
    assert.deepEqual(otherFilter, { vendorAdminPhone: OTHER_PHONE });
    assert.deepEqual(superFilter, {});

    const multiRows = applyMongoFilter(inventory, multiFilter);
    const otherRows = applyMongoFilter(inventory, otherFilter);
    const superRows = applyMongoFilter(inventory, superFilter);

    assert.deepEqual(
      multiRows.map((r) => r._id),
      ["multi-chennai"]
    );
    assert.deepEqual(
      otherRows.map((r) => r._id),
      ["other-madurai"]
    );
    assert.ok(superRows.some((r) => r._id === "cabzii-chennai"));
    assert.ok(!multiRows.some((r) => r.vendor === "Cabzii Partner"));
    assert.ok(!otherRows.some((r) => r.vendor === "Cabzii Partner"));
    assert.ok(!multiRows.some((r) => r._id === "other-madurai"));
  });
});

describe("Phase 3 — 3 vendor cannot access another vendor's Cab", () => {
  it("update/delete filter requires authenticated phone, so another vendor's id does not match", () => {
    const multiReq = { user: { role: "vendor_admin", mobileNumber: MULTI_PHONE } };
    const filter = docMatchForVendor(multiReq, "other-madurai");
    assert.deepEqual(filter, { _id: "other-madurai", vendorAdminPhone: MULTI_PHONE });
    assert.equal(applyMongoFilter(inventory, filter).length, 0);
    assert.equal(catalogOwnedByVendor(otherMadurai, multiReq), false);
    assert.equal(catalogOwnedByVendor(multiChennai, multiReq), true);
  });
});

describe("Phase 3 — 4/5 registration number privacy", () => {
  it("customer responses hide the plate; admin/ops keep it", () => {
    const customer = normalizeCabForApi(multiChennai);
    const admin = normalizeCabForApi(multiChennai, { includeRegistration: true });
    assert.equal(Object.prototype.hasOwnProperty.call(customer, "registrationNumber"), false);
    assert.equal(customer.registrationNumber, undefined);
    assert.equal(admin.registrationNumber, "TN01AB1111");
  });
});

describe("Phase 3 — 6 city / service-area data is used by matching", () => {
  it("Chennai, Tiruchi, Vellore, Madurai, Coimbatore match existing city/serviceAreas/pickupLocations", () => {
    const rows = [
      cab({ _id: "chennai", city: "Chennai", serviceAreas: ["Chennai"], pickupLocations: ["Chennai Airport"] }),
      cab({
        _id: "tiruchi",
        vendorAdminPhone: "9000003545",
        city: "TIRUCHI",
        serviceAreas: ["Tiruchi"],
        pickupLocations: ["Tiruchirappalli"]
      }),
      cab({
        _id: "vellore",
        vendorAdminPhone: "9000000008",
        city: "Vellore",
        serviceAreas: ["Vellore"],
        pickupLocations: ["Katpadi"]
      }),
      cab({
        _id: "madurai",
        vendorAdminPhone: OTHER_PHONE,
        city: "Madurai",
        serviceAreas: ["Madurai"],
        pickupLocations: ["Madurai"]
      }),
      cab({
        _id: "coimbatore",
        vendorAdminPhone: "9000000012",
        city: "Coimbatore",
        serviceAreas: ["Coimbatore"],
        pickupLocations: ["Coimbatore Airport"]
      })
    ];

    assert.equal(matchCabs(rows, { pickupCity: "Chennai", category: "Sedan" }).cabs[0]._id, "chennai");
    assert.equal(matchCabs(rows, { pickupCity: "Tiruchi", category: "Sedan" }).cabs[0]._id, "tiruchi");
    assert.equal(matchCabs(rows, { pickupCity: "Vellore", category: "Sedan" }).cabs[0]._id, "vellore");
    assert.equal(matchCabs(rows, { pickupCity: "Madurai", category: "Sedan" }).cabs[0]._id, "madurai");
    assert.equal(matchCabs(rows, { pickupCity: "Coimbatore", category: "Sedan" }).cabs[0]._id, "coimbatore");
  });

  it("admin edits to city/serviceAreas/status/availability naturally change future matching", () => {
    const before = cab({
      _id: "editable",
      city: "Chennai",
      serviceAreas: ["Chennai"],
      pickupLocations: ["Chennai"]
    });
    assert.equal(matchCabs([before], { pickupCity: "Chennai", category: "Sedan" }).source, "vendor");

    const moved = {
      ...before,
      city: "Coimbatore",
      location: "Coimbatore",
      serviceAreas: ["Coimbatore"],
      pickupLocations: ["Coimbatore"]
    };
    assert.equal(matchCabs([moved], { pickupCity: "Chennai", category: "Sedan" }).cabs.length, 0);
    assert.equal(matchCabs([moved], { pickupCity: "Coimbatore", category: "Sedan" }).cabs[0]._id, "editable");

    const inactive = { ...before, status: "inactive" };
    assert.equal(matchCabs([inactive], { pickupCity: "Chennai", category: "Sedan" }).cabs.length, 0);

    const busy = { ...before, availabilityStatus: "busy" };
    assert.equal(matchCabs([busy], { pickupCity: "Chennai", category: "Sedan" }).cabs.length, 0);

    const suv = { ...before, category: "SUV", type: "SUV" };
    assert.equal(matchCabs([suv], { pickupCity: "Chennai", category: "Sedan" }).cabs.length, 0);
  });
});

describe("Phase 3 — 7/8 vendor inventory wins; Cabzii fallback unchanged", () => {
  it("eligible vendor inventory is returned instead of Cabzii", () => {
    const result = matchCabs(inventory, { pickupCity: "Chennai", category: "Sedan" });
    assert.equal(result.source, "vendor");
    assert.equal(result.cabs[0]._id, "multi-chennai");
    assert.ok(!result.cabs.some((row) => row._id === "cabzii-chennai"));
  });

  it("Cabzii fallback is used when vendor inventory is unsuitable; heuristic is empty phone, not ownedByCabzii", () => {
    const matchingSrc = fs.readFileSync(
      path.join(__dirname, "../services/vendorMatchingService.js"),
      "utf8"
    );
    assert.equal(/\b(?:cab|doc|row)\?\.ownedByCabzii\b/.test(matchingSrc), false);
    assert.equal(Object.prototype.hasOwnProperty.call(cabziiChennai, "ownedByCabzii"), false);
    assert.equal(isVendorOwnedCab(multiChennai), true);
    assert.equal(isCabziiFallbackCab(cabziiChennai), true);
    assert.equal(isCabziiFallbackCab(multiChennai), false);

    const result = matchCabs([otherMadurai, cabziiChennai], { pickupCity: "Chennai", category: "Sedan" });
    assert.equal(result.source, "cabzii_fallback");
    assert.equal(result.cabs[0]._id, "cabzii-chennai");
    assert.equal(result.vendorAdminPhone, "");
  });
});

describe("Phase 3 — 9 existing active Cab listing remains unchanged", () => {
  it("public listing stays active-only and admin=1 does not run city matching", () => {
    const publicFilter = catalogListFilter({ user: null, query: {} });
    assert.deepEqual(publicFilter, activeCatalogFilter());
    assert.equal(wantsCityMatching({ query: {} }), false);
    assert.equal(wantsCityMatching({ query: { city: "Chennai" } }), false);
    assert.equal(wantsCityMatching({ query: { admin: "1", priorityCity: "Chennai" } }), false);
    assert.equal(wantsCityMatching({ query: { priorityCity: "Chennai" } }), true);
  });
});

describe("Phase 3 — 10 vendorId spoof protection remains unchanged", () => {
  it("customer vendorId cannot select a vendor; vendor cannot stamp another vendorId", () => {
    const matched = searchCabsForCustomer(inventory, {
      priorityCity: "Chennai",
      category: "Sedan",
      vendorId: OTHER_PHONE
    });
    assert.equal(matched.data[0]._id, "multi-chennai");

    const vendorReq = { user: { role: "vendor_admin", mobileNumber: MULTI_PHONE } };
    const body = sanitizeInventoryPayload(vendorReq, { vendorId: OTHER_PHONE, title: "X" }, null);
    assert.equal(body.vendorId, undefined);

    assert.throws(
      () => sanitizeInventoryPayload(vendorReq, { status: "suspended" }, {}),
      /cannot set that vehicle status/
    );
    const busy = sanitizeInventoryPayload(
      vendorReq,
      { availabilityStatus: "busy" },
      { availabilityStatus: "available" }
    );
    assert.equal(busy.availabilityStatus, "available");
    const verify = sanitizeInventoryPayload(
      vendorReq,
      { verificationStatus: "approved" },
      { verificationStatus: "pending" }
    );
    assert.equal(verify.verificationStatus, "pending");

    const publicRow = normalizeCabForApi(multiChennai);
    assert.equal(Object.prototype.hasOwnProperty.call(publicRow, "vendorId"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(publicRow, "vendorAdminPhone"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(publicRow, "verificationStatus"), false);
  });
});
