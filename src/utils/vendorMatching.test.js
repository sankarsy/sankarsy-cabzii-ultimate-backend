"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  matchCabs,
  isEligibleCab,
  isVendorOwnedCab,
  isCabziiFallbackCab
} = require("../services/vendorMatchingService");
const { listFilterForVendor } = require("./vendorAccess");
const { catalogOwnedByVendor } = require("./bookingAvailability");
const { activeCatalogFilter, catalogListFilter } = require("./listQuery");
const { isGenericVendorName } = require("./vendorOwnership");
const { sanitizeInventoryPayload } = require("./vehicleInventory");

function cab(overrides) {
  return {
    _id: "cab-default",
    title: "Dzire",
    vendor: "MULTI TRAVELS",
    vendorAdminPhone: "8220873545",
    city: "Chennai",
    location: "Chennai",
    serviceAreas: ["Chennai", "Tambaram"],
    pickupLocations: ["Chennai Airport"],
    status: "active",
    availabilityStatus: "available",
    category: "Sedan",
    type: "Sedan",
    seats: 4,
    isDeleted: false,
    registrationNumber: "TN01AB1111",
    ...overrides
  };
}

const vendorChennaiSedan = cab({ _id: "v-chennai-sedan" });
const vendorMaduraiSuv = cab({
  _id: "v-madurai-suv",
  vendor: "Madurai Cabs",
  vendorAdminPhone: "9000000002",
  city: "Madurai",
  location: "Madurai",
  serviceAreas: ["Madurai"],
  pickupLocations: ["Madurai"],
  category: "SUV",
  type: "SUV",
  seats: 6,
  registrationNumber: "TN58CD2222"
});
const vendorChennaiTempo = cab({
  _id: "v-chennai-tempo",
  vendor: "Tempo Co",
  vendorAdminPhone: "9000000003",
  city: "Chennai",
  serviceAreas: ["Chennai"],
  pickupLocations: ["Chennai"],
  category: "Tempo Traveller",
  type: "Tempo Traveller",
  seats: 12,
  registrationNumber: "TN01TE3333"
});
const cabziiChennaiSedan = cab({
  _id: "cabzii-chennai",
  vendor: "Cabzii Partner",
  vendorAdminPhone: "",
  registrationNumber: "TN00CABZII"
});
const draftVendorSedan = cab({
  _id: "draft",
  status: "draft",
  vendorAdminPhone: "8220873545"
});

const inventory = [
  vendorChennaiSedan,
  vendorMaduraiSuv,
  vendorChennaiTempo,
  cabziiChennaiSedan,
  draftVendorSedan
];

describe("vendor matching — location/service-area (not GPS)", () => {
  it("pickup city matches vendor Cab service area", () => {
    const result = matchCabs(inventory, { pickupCity: "Chennai", category: "Sedan" });
    assert.equal(result.matchingMode, "location_service_area");
    assert.equal(result.source, "vendor");
    assert.equal(result.vendorAdminPhone, "8220873545");
    assert.equal(result.cabs.length, 1);
    assert.equal(result.cabs[0]._id, "v-chennai-sedan");
  });

  it("matching vendor is preferred over fallback Cabzii inventory", () => {
    const result = matchCabs(inventory, { pickup: "Chennai", category: "Sedan" });
    assert.equal(result.source, "vendor");
    assert.ok(result.cabs.every((row) => row.vendorAdminPhone === "8220873545"));
    assert.ok(!result.cabs.some((row) => row._id === "cabzii-chennai"));
  });

  it("vendor with no suitable Cab is skipped", () => {
    const result = matchCabs(inventory, { pickupCity: "Chennai", category: "Sedan" });
    assert.ok(!result.cabs.some((row) => row._id === "v-chennai-tempo"));
    assert.equal(result.vendorAdminPhone, "8220873545");
  });

  it("Cabzii fallback is returned when no vendor matches", () => {
    const onlyWrongVendor = [vendorMaduraiSuv, cabziiChennaiSedan];
    const result = matchCabs(onlyWrongVendor, { pickupCity: "Chennai", category: "Sedan" });
    assert.equal(result.source, "cabzii_fallback");
    assert.equal(result.vendorAdminPhone, "");
    assert.equal(result.cabs.length, 1);
    assert.equal(result.cabs[0]._id, "cabzii-chennai");
  });

  it("category/type filtering works", () => {
    const suv = matchCabs(inventory, { pickupCity: "Madurai", type: "SUV" });
    assert.equal(suv.source, "vendor");
    assert.equal(suv.cabs[0]._id, "v-madurai-suv");

    const sedanInMadurai = matchCabs(inventory, { pickupCity: "Madurai", category: "Sedan" });
    assert.ok(!sedanInMadurai.cabs.some((row) => row.category === "SUV"));
  });

  it("vendorId supplied by customer cannot control vendor selection", () => {
    const result = matchCabs(inventory, {
      pickupCity: "Chennai",
      category: "Sedan",
      vendorId: "9000000002",
      vendorAdminPhone: "9000000002"
    });
    assert.equal(result.vendorAdminPhone, "8220873545");
    assert.notEqual(result.vendorAdminPhone, "9000000002");
  });

  it("uses empty vendorAdminPhone / generic Cabzii name as fallback, not ownedByCabzii", () => {
    assert.equal(isGenericVendorName("Cabzii Partner"), true);
    assert.equal(isVendorOwnedCab(vendorChennaiSedan), true);
    assert.equal(isCabziiFallbackCab(cabziiChennaiSedan), true);
    assert.equal(isEligibleCab(draftVendorSedan, { category: "Sedan" }), false);
    assert.equal(isEligibleCab(vendorChennaiSedan, { category: "Sedan" }), true);
  });
});

describe("Phase 1C business scenarios — city/service-area only", () => {
  const chennaiVendor = cab({
    _id: "chennai-vendor-dzire",
    vendor: "MULTI TRAVELS",
    vendorAdminPhone: "8220873545",
    city: "Chennai",
    location: "Chennai",
    serviceAreas: ["Chennai", "Tambaram"],
    pickupLocations: ["Chennai Airport"],
    category: "Sedan",
    type: "Sedan",
    seats: 4
  });
  const tiruchiVendor = cab({
    _id: "tiruchi-vendor-innova",
    vendor: "MULTI TRAVELS",
    vendorAdminPhone: "9000003545",
    city: "TIRUCHI",
    location: "TIRUCHI",
    serviceAreas: ["Tiruchi", "Trichy"],
    pickupLocations: ["Tiruchirappalli"],
    category: "SUV",
    type: "SUV",
    seats: 7
  });
  const velloreVendor = cab({
    _id: "vellore-vendor-etios",
    vendor: "Vellore Cabs",
    vendorAdminPhone: "9000000008",
    city: "Vellore",
    location: "Vellore",
    serviceAreas: ["Vellore"],
    pickupLocations: ["Katpadi"],
    category: "Sedan",
    type: "Sedan",
    seats: 4
  });
  const serviceAreaOnlyTiruchi = cab({
    _id: "service-area-tiruchi",
    vendor: "Delta Travels",
    vendorAdminPhone: "9000000009",
    city: "Madurai",
    location: "Madurai",
    serviceAreas: ["Tiruchi", "Thanjavur"],
    pickupLocations: [],
    category: "Sedan",
    type: "Sedan",
    seats: 4
  });
  const cabziiChennai = cab({
    _id: "cabzii-chennai-active",
    vendor: "Cabzii Partner",
    vendorAdminPhone: "",
    city: "Chennai",
    serviceAreas: ["Chennai"],
    pickupLocations: ["Chennai"],
    category: "Sedan",
    type: "Sedan",
    seats: 4,
    registrationNumber: "TN00CZ0001"
  });
  const cabziiTiruchi = cab({
    _id: "cabzii-tiruchi-active",
    vendor: "Cabzii",
    vendorAdminPhone: "",
    city: "Tiruchi",
    serviceAreas: ["Tiruchi"],
    pickupLocations: ["Tiruchi"],
    category: "SUV",
    type: "SUV",
    seats: 7
  });
  const cabziiVellore = cab({
    _id: "cabzii-vellore-active",
    vendor: "Cabzii Partner",
    vendorAdminPhone: "",
    city: "Vellore",
    serviceAreas: ["Vellore"],
    pickupLocations: ["Vellore"],
    category: "Sedan",
    type: "Sedan",
    seats: 4
  });
  const busyChennaiVendor = cab({
    _id: "busy-chennai",
    vendorAdminPhone: "9000000010",
    city: "Chennai",
    serviceAreas: ["Chennai"],
    availabilityStatus: "busy",
    category: "Sedan",
    type: "Sedan"
  });
  const inactiveTiruchiVendor = cab({
    _id: "inactive-tiruchi",
    vendorAdminPhone: "9000000011",
    city: "Tiruchi",
    serviceAreas: ["Tiruchi"],
    status: "inactive",
    category: "Sedan",
    type: "Sedan"
  });

  const market = [
    chennaiVendor,
    tiruchiVendor,
    velloreVendor,
    serviceAreaOnlyTiruchi,
    cabziiChennai,
    cabziiTiruchi,
    cabziiVellore,
    busyChennaiVendor,
    inactiveTiruchiVendor
  ];

  it("Chennai customer gets Chennai vendor Cabs first, not Tiruchi or Vellore vendors", () => {
    const result = matchCabs(market, { pickupCity: "Chennai", category: "Sedan" });
    assert.equal(result.source, "vendor");
    assert.equal(result.matchingMode, "location_service_area");
    assert.equal(result.vendorAdminPhone, "8220873545");
    assert.ok(result.cabs.every((row) => row._id === "chennai-vendor-dzire"));
    assert.ok(!result.cabs.some((row) => row.city === "TIRUCHI" || row.city === "Vellore"));
  });

  it("Tiruchi customer gets Tiruchi vendor Cabs first, not Chennai or Vellore vendors", () => {
    const result = matchCabs(market, { pickupCity: "Tiruchi", type: "SUV", seats: 7 });
    assert.equal(result.source, "vendor");
    assert.equal(result.vendorAdminPhone, "9000003545");
    assert.equal(result.cabs[0]._id, "tiruchi-vendor-innova");
    assert.ok(!result.cabs.some((row) => row._id === "chennai-vendor-dzire"));
    assert.ok(!result.cabs.some((row) => row._id === "vellore-vendor-etios"));
  });

  it("Vellore customer gets Vellore vendor Cabs first", () => {
    const result = matchCabs(market, { pickup: "Vellore", category: "Sedan" });
    assert.equal(result.source, "vendor");
    assert.equal(result.vendorAdminPhone, "9000000008");
    assert.equal(result.cabs[0]._id, "vellore-vendor-etios");
  });

  it("wrong-city vendor is excluded for a Chennai customer", () => {
    const result = matchCabs([tiruchiVendor, velloreVendor, cabziiChennai], {
      pickupCity: "Chennai",
      category: "Sedan"
    });
    assert.ok(!result.cabs.some((row) => row._id === "tiruchi-vendor-innova"));
    assert.ok(!result.cabs.some((row) => row._id === "vellore-vendor-etios"));
  });

  it("vendor service-area match works when Cab city is a different city", () => {
    const result = matchCabs([serviceAreaOnlyTiruchi, chennaiVendor, cabziiTiruchi], {
      pickupCity: "Tiruchi",
      category: "Sedan"
    });
    assert.equal(result.source, "vendor");
    assert.equal(result.vendorAdminPhone, "9000000009");
    assert.equal(result.cabs[0]._id, "service-area-tiruchi");
  });

  it("when a suitable city vendor exists, Cabzii fallback is not mixed into vendor results", () => {
    const result = matchCabs(market, { pickupCity: "Chennai", category: "Sedan" });
    assert.equal(result.source, "vendor");
    assert.ok(result.cabs.every((row) => String(row.vendorAdminPhone || "").trim() !== ""));
    assert.ok(!result.cabs.some((row) => row.vendor === "Cabzii Partner" || row.vendor === "Cabzii"));
  });

  it("when no suitable city vendor exists, Cabzii active Cabs are returned", () => {
    const noChennaiVendor = [tiruchiVendor, velloreVendor, cabziiChennai, busyChennaiVendor];
    const result = matchCabs(noChennaiVendor, { pickupCity: "Chennai", category: "Sedan" });
    assert.equal(result.source, "cabzii_fallback");
    assert.equal(result.vendorAdminPhone, "");
    assert.ok(result.cabs.some((row) => row._id === "cabzii-chennai-active"));
    assert.ok(result.cabs.every((row) => !row.vendorAdminPhone));
  });

  it("busy or inactive vendor Cabs are not treated as a suitable city vendor", () => {
    const result = matchCabs([busyChennaiVendor, inactiveTiruchiVendor, cabziiChennai], {
      pickupCity: "Chennai",
      category: "Sedan"
    });
    assert.equal(result.source, "cabzii_fallback");
    assert.equal(result.cabs[0]._id, "cabzii-chennai-active");
  });

  it("category, type, and seats still filter after city match", () => {
    const tooSmall = matchCabs(market, { pickupCity: "Chennai", category: "Sedan", seats: 7 });
    assert.ok(!tooSmall.cabs.some((row) => row._id === "chennai-vendor-dzire"));

    const tempo = matchCabs(market, { pickupCity: "Chennai", type: "SUV" });
    assert.ok(!tempo.cabs.some((row) => row.category === "Sedan" && row.vendorAdminPhone === "8220873545"));
  });

  it("customer vendorId cannot force Tiruchi inventory onto a Chennai pickup", () => {
    const result = matchCabs(market, {
      pickupCity: "Chennai",
      category: "Sedan",
      vendorId: "9000003545",
      vendor: "MULTI TRAVELS"
    });
    assert.equal(result.vendorAdminPhone, "8220873545");
    assert.notEqual(result.vendorAdminPhone, "9000003545");
  });
});

describe("matching does not change vendor isolation or public listing rules", () => {
  it("existing vendor isolation remains phone-scoped", () => {
    const req = { user: { role: "vendor_admin", mobileNumber: "8220873545" } };
    assert.deepEqual(listFilterForVendor(req), { vendorAdminPhone: "8220873545" });
    assert.equal(catalogOwnedByVendor(vendorChennaiSedan, req), true);
    assert.equal(catalogOwnedByVendor(vendorMaduraiSuv, req), false);
    const body = sanitizeInventoryPayload(req, { vendorId: "9000000002", title: "X" }, null);
    assert.equal(body.vendorId, undefined);
  });

  it("existing public active-Cab behaviour remains unchanged", () => {
    const publicFilter = catalogListFilter({ user: null, query: {} });
    assert.deepEqual(publicFilter, activeCatalogFilter());
    assert.equal(publicFilter.isDeleted.$ne, true);
    const statuses = publicFilter.$or.map((part) => part.status);
    assert.ok(statuses.includes("active"));
    assert.ok(!JSON.stringify(publicFilter).includes("registrationNumber"));
  });
});
