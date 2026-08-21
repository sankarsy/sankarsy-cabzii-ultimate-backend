"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  sellingPrice,
  cabPackageIdFromTrip,
  trustedDistanceKm,
  resolveVehicleFare,
  resolveBusFare,
  resolveTourFare,
  composeFare,
  seatPriceKey
} = require("./bookingFare");
const { stripUntrustedPricing, applyFareSnapshot } = require("./bookingIntegrity");

const cab = {
  price: 3000,
  farePackages: {
    local4hr: { price: 1200, extraKmRate: 14 },
    local8hr: { price: 2000, extraKmRate: 14 },
    outstationOneWay: { price: 3000, extraKmRate: 14 },
    outstationRoundTrip: { price: 4800, extraKmRate: 14 }
  }
};

describe("bookingFare", () => {
  it("uses selling price not originalPrice when price is set", () => {
    assert.equal(sellingPrice({ price: 3000, originalPrice: 5000 }), 3000);
  });

  it("maps outstation round trip to the two-way package", () => {
    assert.equal(cabPackageIdFromTrip({ tripType: "outstation", roundTrip: true }), "outstation_twoway");
  });

  it("TEST 1: package-only fare matches catalog price", () => {
    const resolved = resolveVehicleFare(cab, { tripType: "outstation", packageId: "outstation_oneway" }, "cab");
    assert.equal(resolved.baseFare, 3000);
  });

  it("adds extra km beyond included kilometers plus driver batta on outstation", () => {
    const tariffCab = {
      driverAllowance: 600,
      packages: [
        {
          packageType: "one_way",
          price: 3250,
          includedKm: 250,
          extraKmRate: 15,
          active: true
        }
      ]
    };
    const noCoords = resolveVehicleFare(tariffCab, { tripType: "outstation" }, "cab");
    assert.equal(noCoords.baseFare, 3850);
  });

  it("selects the 10-hour package when hours exceed 7 and a 10hr slab exists", () => {
    const van = {
      packages: [
        { packageType: "local_5hr", price: 3000, includedHours: 5, includedKm: 50, extraKmRate: 22, active: true },
        { packageType: "local_10hr", price: 6000, includedHours: 10, includedKm: 100, extraKmRate: 22, active: true },
        { packageType: "local_15hr", price: 9000, includedHours: 15, includedKm: 150, extraKmRate: 22, active: true }
      ]
    };
    assert.equal(cabPackageIdFromTrip({ tripType: "hourly", packageHours: 8 }, van), "local_10hr");
    assert.equal(cabPackageIdFromTrip({ tripType: "hourly", packageHours: 13 }, van), "local_15hr");
    assert.equal(cabPackageIdFromTrip({ tripType: "hourly", packageHours: 5 }, van), "local_5hr");
    const fare = resolveVehicleFare(van, { tripType: "hourly", packageHours: 9 }, "cab");
    assert.equal(fare.baseFare, 6000);
  });

  it("does not invent a missing 4-hour package", () => {
    const hycross = {
      packages: [
        { packageType: "local_8hr", price: 5500, includedHours: 8, includedKm: 80, extraKmRate: 28, active: true }
      ]
    };
    const fare = resolveVehicleFare(hycross, { tripType: "hourly", packageHours: 4 }, "cab");
    assert.equal(fare.baseFare, 5500);
  });

  it("does not trust client distanceKm", () => {
    const withFakeDistance = trustedDistanceKm({
      distanceKm: 1,
      pickupLat: 12.97,
      pickupLng: 77.59,
      dropLat: 13.08,
      dropLng: 80.27
    });
    assert.ok(withFakeDistance > 50);
    assert.equal(trustedDistanceKm({ distanceKm: 999 }), 0);
  });

  it("tour fare uses catalog price times cabType multiplier", () => {
    const pkg = {
      price: 10000,
      cabTypes: [{ id: "suv", multiplier: 1.2 }]
    };
    const resolved = resolveTourFare(pkg, { cabType: "suv" });
    assert.equal(resolved.baseFare, 12000);
  });

  it("bus fare sums seat prices from the trip, not the client amount", () => {
    const trip = { seaterPrice: 599, lowerBerthPrice: 999, upperBerthPrice: 799, tripGuaranteePrice: 24 };
    const resolved = resolveBusFare(trip, ["S1", "L1"], false);
    assert.equal(resolved.baseFare, 599 + 999);
    assert.equal(seatPriceKey("U12"), "upperBerth");
  });
});

describe("price tampering", () => {
  it("TEST 2: client amount=1 is ignored; snapshot uses server fare", () => {
    const snapshot = composeFare({
      baseFare: 3000,
      fees: 0,
      couponResult: { code: "", discount: 0 },
      pricingSource: "package:outstation_oneway",
      vendor: "Vendor A",
      vendorAdminPhone: "9999999999"
    });
    const stored = applyFareSnapshot(
      stripUntrustedPricing({
        type: "cab",
        amount: 1,
        totalFare: 1,
        price: 1,
        offerPrice: 1
      }),
      snapshot
    );
    assert.equal(stored.amount, 3000);
    assert.equal(stored.finalAmount, 3000);
    assert.equal(stored.baseFare, 3000);
  });

  it("TEST 3: client discount=5000 is ignored", () => {
    const snapshot = composeFare({
      baseFare: 3000,
      couponResult: { code: "", discount: 0 },
      pricingSource: "package"
    });
    const stored = applyFareSnapshot(
      stripUntrustedPricing({ amount: 1, discount: 5000, couponDiscount: 5000, tax: 99 }),
      snapshot
    );
    assert.equal(stored.discount, 0);
    assert.equal(stored.amount, 3000);
    assert.equal(stored.tax, 0);
  });
});
