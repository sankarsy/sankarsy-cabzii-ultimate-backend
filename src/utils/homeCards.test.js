const { homeCardDedupeKey, dedupeHomeCards } = require("./homeCards");

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

describe("home card dedupe", () => {
  it("keeps the first of identical title+href cards", () => {
    const rows = [
      { section: "routes", title: "Chennai → Tirupati", href: "/routes/chennai-to-tirupati-cab", fare: "From ₹3,500" },
      { section: "routes", title: "Chennai → Tirupati", href: "/routes/chennai-to-tirupati-cab", fare: "From ₹3,500" },
      { section: "routes", title: "Chennai → Trichy", href: "/routes/chennai-to-trichy-cab", fare: "From ₹4,200" }
    ];
    const unique = dedupeHomeCards(rows);
    assert.equal(unique.length, 2);
    assert.equal(unique[0].title, "Chennai → Tirupati");
    assert.equal(unique[1].title, "Chennai → Trichy");
  });

  it("does not merge different hrefs with the same title", () => {
    const rows = [
      { section: "offers", title: "Airport", href: "/services/airport-taxi/chennai" },
      { section: "offers", title: "Airport", href: "/services/airport-taxi/madurai" }
    ];
    assert.equal(dedupeHomeCards(rows).length, 2);
    assert.ok(homeCardDedupeKey(rows[0]) !== homeCardDedupeKey(rows[1]));
  });
});
