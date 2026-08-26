"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { searchCabsForCustomer, wantsCityMatching } = require("./cabSearchMatching");
const { normalizeCabForApi } = require("./catalogNormalize");
const { catalogListFilter, activeCatalogFilter } = require("./listQuery");
const { loadOwnedVehicle } = require("./bookingAssignment");

function cab(overrides) {
  return {
    _id: "cab-default",
    title: "Dzire",
    vendor: "MULTI TRAVELS",
    vendorAdminPhone: "8220873545",
    city: "Chennai",
    location: "Chennai",
    serviceAreas: ["Chennai"],
    pickupLocations: ["Chennai Airport"],
    status: "active",
    availabilityStatus: "available",
    category: "Sedan",
    type: "Sedan",
    seats: 4,
    price: 2500,
    isDeleted: false,
    registrationNumber: "TN01AB1111",
    verificationStatus: "approved",
    ...overrides
  };
}

const chennaiVendor = cab({ _id: "chennai-vendor" });
const tiruchiVendor = cab({
  _id: "tiruchi-vendor",
  vendor: "MULTI TRAVELS",
  vendorAdminPhone: "9000003545",
  city: "TIRUCHI",
  location: "TIRUCHI",
  serviceAreas: ["Tiruchi"],
  pickupLocations: ["Tiruchi"],
  category: "SUV",
  type: "SUV",
  seats: 7,
  registrationNumber: "TN45CD2222"
});
const velloreVendor = cab({
  _id: "vellore-vendor",
  vendor: "Vellore Cabs",
  vendorAdminPhone: "9000000008",
  city: "Vellore",
  location: "Vellore",
  serviceAreas: ["Vellore"],
  pickupLocations: ["Katpadi"],
  registrationNumber: "TN23EF3333"
});
const cabziiChennai = cab({
  _id: "cabzii-chennai",
  vendor: "Cabzii Partner",
  vendorAdminPhone: "",
  registrationNumber: "TN00CZ0001"
});
const market = [chennaiVendor, tiruchiVendor, velloreVendor, cabziiChennai];

function publicRows(result) {
  return result.data.map((doc) => normalizeCabForApi(doc));
}

describe("customer cab search matching integration", () => {
  it("Chennai → Chennai vendor Cabs first", () => {
    const result = searchCabsForCustomer(market, { priorityCity: "Chennai", category: "Sedan" });
    assert.equal(result.source, "vendor");
    assert.equal(result.matchingMode, "location_service_area");
    assert.equal(result.data[0]._id, "chennai-vendor");
    assert.ok(!result.data.some((row) => row._id === "tiruchi-vendor" || row._id === "vellore-vendor"));
  });

  it("Tiruchi → Tiruchi vendor Cabs first", () => {
    const result = searchCabsForCustomer(market, { priorityCity: "Tiruchi", type: "SUV", seats: 7 });
    assert.equal(result.source, "vendor");
    assert.equal(result.data[0]._id, "tiruchi-vendor");
  });

  it("Vellore → Vellore vendor Cabs first", () => {
    const result = searchCabsForCustomer(market, { priorityCity: "Vellore", category: "Sedan" });
    assert.equal(result.source, "vendor");
    assert.equal(result.data[0]._id, "vellore-vendor");
  });

  it("wrong-city vendor excluded", () => {
    const result = searchCabsForCustomer([tiruchiVendor, velloreVendor, cabziiChennai], {
      priorityCity: "Chennai",
      category: "Sedan"
    });
    assert.ok(!result.data.some((row) => row._id === "tiruchi-vendor" || row._id === "vellore-vendor"));
  });

  it("no vendor → Cabzii fallback", () => {
    const result = searchCabsForCustomer([tiruchiVendor, cabziiChennai], {
      priorityCity: "Chennai",
      category: "Sedan"
    });
    assert.equal(result.source, "cabzii_fallback");
    assert.equal(result.data[0]._id, "cabzii-chennai");
  });

  it("category filtering", () => {
    const result = searchCabsForCustomer(market, { priorityCity: "Chennai", category: "SUV" });
    assert.ok(!result.data.some((row) => row._id === "chennai-vendor"));
  });

  it("seats filtering", () => {
    const result = searchCabsForCustomer(market, { priorityCity: "Chennai", category: "Sedan", seats: 7 });
    assert.ok(!result.data.some((row) => row._id === "chennai-vendor"));
  });

  it("vendorId cannot control result", () => {
    const result = searchCabsForCustomer(market, {
      priorityCity: "Chennai",
      category: "Sedan",
      vendorId: "9000003545"
    });
    assert.equal(result.data[0]._id, "chennai-vendor");
    assert.notEqual(result.data[0].vendorAdminPhone, "9000003545");
  });

  it("registrationNumber not returned on customer serialization", () => {
    const result = searchCabsForCustomer(market, { priorityCity: "Chennai", category: "Sedan" });
    const rows = publicRows(result);
    assert.ok(rows.length > 0);
    for (const row of rows) {
      assert.equal(Object.prototype.hasOwnProperty.call(row, "registrationNumber"), false);
    }
  });

  it("vendorAdminPhone not returned on customer serialization", () => {
    const result = searchCabsForCustomer(market, { priorityCity: "Chennai", category: "Sedan" });
    const rows = publicRows(result);
    for (const row of rows) {
      assert.equal(Object.prototype.hasOwnProperty.call(row, "vendorAdminPhone"), false);
      assert.equal(row.vendorAdminPhone, undefined);
      assert.ok(row.vendor);
    }
  });
});

describe("customer search matching gates and unchanged listing/booking", () => {
  it("applies matching only for explicit priorityCity, not admin or SEO city=", () => {
    assert.equal(wantsCityMatching({ query: { priorityCity: "Chennai" } }), true);
    assert.equal(wantsCityMatching({ query: { city: "Chennai" } }), false);
    assert.equal(wantsCityMatching({ query: { priorityCity: "Chennai", admin: "1" } }), false);
    assert.equal(wantsCityMatching({ query: {} }), false);
  });

  it("existing public active Cab behaviour remains unchanged", () => {
    const publicFilter = catalogListFilter({ user: null, query: {} });
    assert.deepEqual(publicFilter, activeCatalogFilter());
    assert.equal(wantsCityMatching({ query: {} }), false);
  });

  it("existing booking assignment API remains loadOwnedVehicle", () => {
    assert.equal(typeof loadOwnedVehicle, "function");
  });
});
