"use strict";

const { Booking } = require("../models/Booking");
const { SeoEvent } = require("../models/SeoEvent");
const { SearchConsoleSnapshot } = require("../models/SearchConsoleSnapshot");
const { SeoPageInsight } = require("../models/SeoPageInsight");
const { Cab } = require("../models/Cab");
const { Package } = require("../models/Package");
const noindexPaths = require("../data/seoNoindexPaths.json");
const {
  ATTRIBUTION_WINDOW_LABEL,
  unavailable,
  rateOrNA,
  bookingFareGmv,
  isCompletedBooking,
  isSeoInScopeType,
  parsePeriod,
  inferCitySlug,
  operationalServiceKey,
  recommendIndexReview,
  recommendVendors
} = require("../utils/seoRevenueMath");
const { canonicalizeGscPage, parseLandingMeta, gscSafeRange } = require("../utils/gscCanonical");
const { publicGscStatus } = require("../utils/gscConfig");

const FEATURED_SPOTLIGHT = [
  {
    id: "chennai-airport",
    title: "CHENNAI",
    subtitle: "Airport Taxi",
    landingPage: "/services/airport-taxi/chennai",
    city: "chennai",
    service: "airport-taxi"
  },
  {
    id: "chennai-tirupati",
    title: "TIRUPATI",
    subtitle: "Chennai → Tirupati Route",
    landingPage: "/routes/chennai-to-tirupati-cab",
    city: "chennai",
    service: "one-way-cab",
    origin: "chennai",
    destination: "tirupati"
  },
  {
    id: "coimbatore-airport",
    title: "COIMBATORE",
    subtitle: "Airport Taxi",
    landingPage: "/services/airport-taxi/coimbatore",
    city: "coimbatore",
    service: "airport-taxi"
  }
];

const FEATURED_ROUTES = [
  "/routes/chennai-to-tirupati-cab",
  "/routes/chennai-to-pondicherry-cab",
  "/routes/chennai-to-bangalore-cab",
  "/routes/chennai-to-kanchipuram-cab",
  "/routes/chennai-to-tiruvannamalai-cab",
  "/routes/chennai-to-trichy-cab",
  "/routes/chennai-to-madurai-cab",
  "/routes/chennai-to-rameswaram-cab",
  "/routes/chennai-to-kanyakumari-cab",
  "/routes/chennai-to-ooty-cab",
  "/routes/madurai-to-rameswaram-cab",
  "/routes/madurai-to-kanyakumari-cab",
  "/routes/coimbatore-to-ooty-cab",
  "/routes/bengaluru-to-tirupati-cab",
  "/routes/bengaluru-to-mysore-cab"
];

function emptyBucket() {
  return {
    bookingStarts: 0,
    completedBookings: 0,
    gmv: 0,
    seoSessions: 0,
    seoBookingStarts: 0
  };
}

function addMoney(bucket, booking) {
  bucket.bookingStarts += 1;
  if (isCompletedBooking(booking)) {
    bucket.completedBookings += 1;
    bucket.gmv += bookingFareGmv(booking);
  }
}

function avgGmv(bucket) {
  if (!bucket.completedBookings) return unavailable("no completed bookings");
  return { available: true, value: Math.round(bucket.gmv / bucket.completedBookings) };
}

function gscForLanding(gscByPage, landingPage, gscConnected) {
  if (!gscConnected) {
    return {
      clicks: unavailable("GSC DATA NOT CONNECTED"),
      impressions: unavailable("GSC DATA NOT CONNECTED"),
      ctr: unavailable("GSC DATA NOT CONNECTED"),
      position: unavailable("GSC DATA NOT CONNECTED")
    };
  }
  const row = gscByPage.get(landingPage);
  if (!row) {
    return {
      clicks: unavailable("not in GSC for this range"),
      impressions: unavailable("not in GSC for this range"),
      ctr: unavailable("not in GSC for this range"),
      position: unavailable("not in GSC for this range")
    };
  }
  return {
    clicks: { available: true, value: row.clicks },
    impressions: { available: true, value: row.impressions },
    ctr: { available: true, value: row.ctr },
    position: { available: true, value: row.position }
  };
}

function selectGscRows(allRows, range) {
  const api = allRows.filter(
    (r) =>
      r.source === "gsc_api" &&
      r.startDate === range.gsc.start &&
      r.endDate === range.gsc.end
  );
  if (api.length) {
    return { rows: api, status: "GSC_API", connected: true, rangeMatch: true };
  }
  const imported = allRows.filter((r) => r.source !== "gsc_api");
  if (imported.length) {
    return { rows: imported, status: "IMPORTED SNAPSHOTS", connected: true, rangeMatch: false };
  }
  return { rows: [], status: "NOT CONNECTED", connected: false, rangeMatch: true };
}

function aggregateGsc(rows) {
  const pageRows = rows.filter((r) => r.dimension === "page" || (r.source === "gsc_api" && !r.keyword));
  const queryRows = rows.filter((r) => r.keyword);
  const forPages = pageRows.length ? pageRows : queryRows;
  const gscByPage = new Map();
  for (const row of forPages) {
    const page = canonicalizeGscPage(row.landingPage || "");
    if (!page) continue;
    const prev = gscByPage.get(page) || { clicks: 0, impressions: 0, position: 0, n: 0 };
    prev.clicks += Number(row.clicks) || 0;
    prev.impressions += Number(row.impressions) || 0;
    prev.position += Number(row.position) || 0;
    prev.n += 1;
    gscByPage.set(page, prev);
  }
  for (const [, row] of gscByPage) {
    row.position = row.n ? Math.round((row.position / row.n) * 10) / 10 : 0;
    row.ctr = row.impressions ? row.clicks / row.impressions : 0;
  }
  const gscByKeyword = queryRows.map((row) => ({
    keyword: row.keyword,
    clicks: Number(row.clicks) || 0,
    impressions: Number(row.impressions) || 0,
    ctr: Number(row.ctr) || (Number(row.impressions) ? Number(row.clicks) / Number(row.impressions) : 0),
    position: Number(row.position) || 0,
    landingPage: canonicalizeGscPage(row.landingPage || "")
  }));
  return { gscByPage, gscByKeyword };
}

function sortTop(map, limit = 20) {
  return [...map.entries()]
    .map(([key, bucket]) => ({ key, ...bucket }))
    .sort((a, b) => b.completedBookings - a.completedBookings || b.gmv - a.gmv)
    .slice(0, limit);
}

function sortTopGmv(map, limit = 20) {
  return [...map.entries()]
    .map(([key, bucket]) => ({ key, ...bucket }))
    .sort((a, b) => b.gmv - a.gmv || b.completedBookings - a.completedBookings)
    .slice(0, limit);
}

async function buildSeoRevenueReport(query) {
  const period = parsePeriod(query);
  const gscRange = gscSafeRange(period);
  const gscStatus = publicGscStatus();
  const bookingMatch = {
    createdAt: { $gte: period.start, $lte: period.end },
    type: { $in: ["cab", "driver", "tour"] }
  };

  const [bookings, seoEvents, gscAllRows, insights, cabCityRows, pilgrimageIds] = await Promise.all([
    Booking.find(bookingMatch)
      .select(
        "amount finalAmount status type pickup drop serviceTripType tripType roundTrip seoAttribution packageId createdAt"
      )
      .lean()
      .limit(20000),
    SeoEvent.aggregate([
      { $match: { createdAt: { $gte: period.start, $lte: period.end } } },
      {
        $group: {
          _id: { eventName: "$eventName", landingPage: "$landingPage", sessionId: "$sessionId" },
          count: { $sum: 1 }
        }
      }
    ]),
    SearchConsoleSnapshot.find({})
      .select(
        "keyword clicks impressions ctr position landingPage snapshotDate source dimension startDate endDate country device searchAppearance"
      )
      .lean()
      .limit(20000),
    SeoPageInsight.find({}).lean().limit(500),
    Cab.aggregate([
      { $match: { isDeleted: { $ne: true }, status: "active" } },
      { $group: { _id: { $toLower: { $ifNull: ["$city", ""] } }, count: { $sum: 1 } } }
    ]),
    Package.find({ category: { $regex: /pilgrim/i } }).select("_id").lean()
  ]);

  const selectedGsc = selectGscRows(gscAllRows, gscRange);
  const gscConnected = selectedGsc.connected;
  const { gscByPage, gscByKeyword } = aggregateGsc(selectedGsc.rows);
  const pilgrimageSet = new Set(pilgrimageIds.map((p) => String(p._id)));

  const sessionsByPage = new Map();
  const startsByPage = new Map();
  for (const ev of seoEvents) {
    const page = ev._id.landingPage;
    const name = ev._id.eventName;
    if (name === "seo_page_view" && ev._id.sessionId) {
      sessionsByPage.set(page, (sessionsByPage.get(page) || 0) + 1);
    }
    if (name === "booking_started") {
      startsByPage.set(page, (startsByPage.get(page) || 0) + (ev.count || 1));
    }
  }

  const attributedPages = new Map();
  const operationalCities = new Map();
  const operationalServices = new Map();
  const operationalRoutes = new Map();
  const airportPages = new Map();
  const actingPages = new Map();
  const tourPages = new Map();
  const pilgrimagePages = new Map();

  let operationalGmv = 0;
  let operationalCompleted = 0;
  let operationalStarts = 0;
  let attributedStarts = 0;
  let attributedCompleted = 0;
  let attributedGmv = 0;
  let truncated = bookings.length >= 20000;

  for (const booking of bookings) {
    if (!isSeoInScopeType(booking.type)) continue;
    operationalStarts += 1;
    if (isCompletedBooking(booking)) {
      operationalCompleted += 1;
      operationalGmv += bookingFareGmv(booking);
    }

    const citySlug = inferCitySlug(booking.pickup) || inferCitySlug(booking.drop);
    if (citySlug) {
      if (!operationalCities.has(citySlug)) operationalCities.set(citySlug, emptyBucket());
      addMoney(operationalCities.get(citySlug), booking);
    }

    let serviceKey = operationalServiceKey(booking);
    if (booking.type === "tour" && booking.packageId && pilgrimageSet.has(String(booking.packageId))) {
      serviceKey = "pilgrimage";
    }
    if (!operationalServices.has(serviceKey)) operationalServices.set(serviceKey, emptyBucket());
    addMoney(operationalServices.get(serviceKey), booking);

    const landing = booking.seoAttribution?.landingPage;
    if (landing) {
      attributedStarts += 1;
      if (!attributedPages.has(landing)) attributedPages.set(landing, emptyBucket());
      addMoney(attributedPages.get(landing), booking);
      if (isCompletedBooking(booking)) {
        attributedCompleted += 1;
        attributedGmv += bookingFareGmv(booking);
      }
      if (landing.startsWith("/routes/")) {
        if (!operationalRoutes.has(landing)) operationalRoutes.set(landing, emptyBucket());
        addMoney(operationalRoutes.get(landing), booking);
      }
      if (landing.includes("airport-taxi")) {
        if (!airportPages.has(landing)) airportPages.set(landing, emptyBucket());
        addMoney(airportPages.get(landing), booking);
      }
      if (landing.includes("acting-driver") || landing === "/call-driver") {
        if (!actingPages.has(landing)) actingPages.set(landing, emptyBucket());
        addMoney(actingPages.get(landing), booking);
      }
      if (landing.includes("holidays") || landing.includes("tour-packages") || landing.includes("pilgrimage")) {
        if (!tourPages.has(landing)) tourPages.set(landing, emptyBucket());
        addMoney(tourPages.get(landing), booking);
      }
      if (landing.includes("pilgrimage") || serviceKey === "pilgrimage") {
        if (!pilgrimagePages.has(landing)) pilgrimagePages.set(landing, emptyBucket());
        addMoney(pilgrimagePages.get(landing), booking);
      }
    }
  }

  // Operational airport/acting when no attribution: still report trip-field matches, labeled separately
  for (const booking of bookings) {
    const citySlug = inferCitySlug(booking.pickup) || inferCitySlug(booking.drop);
    const svc = operationalServiceKey(booking);
    if (svc === "airport-taxi" && citySlug) {
      const path = `/services/airport-taxi/${citySlug}`;
      if (!airportPages.has(path)) airportPages.set(path, { ...emptyBucket(), operationalOnly: true });
      if (!booking.seoAttribution?.landingPage) addMoney(airportPages.get(path), booking);
    }
    if (booking.type === "driver" && citySlug) {
      const path = `/acting-driver/${citySlug}`;
      if (!actingPages.has(path)) actingPages.set(path, { ...emptyBucket(), operationalOnly: true });
      if (!booking.seoAttribution?.landingPage) addMoney(actingPages.get(path), booking);
    }
  }

  const cabCountByCity = new Map(cabCityRows.map((r) => [String(r._id || "").toLowerCase(), r.count]));

  const decorate = (row, landingPage) => {
    const gsc = gscForLanding(gscByPage, landingPage, gscConnected);
    const sessions = sessionsByPage.get(landingPage) || 0;
    const funnelStarts = startsByPage.get(landingPage) || 0;
    const meta = parseLandingMeta(landingPage);
    return {
      landingPage,
      ...meta,
      ...row,
      gmv: { available: true, value: row.gmv, label: "booking_fare_gmv" },
      averageBookingValue: avgGmv(row),
      googleSearchTraffic: unavailable("GA4 / GTM property not connected"),
      ...gsc,
      seoSessions: { available: true, value: sessions },
      firstPartyBookingStarts: { available: true, value: funnelStarts },
      seoToBookingStart: rateOrNA(funnelStarts, sessions),
      seoToCompleted: rateOrNA(row.completedBookings, sessions),
      bookingStartToCompletion: rateOrNA(row.completedBookings, row.bookingStarts)
    };
  };

  const spotlight = FEATURED_SPOTLIGHT.map((spot) => {
    const attributed = attributedPages.get(spot.landingPage) || emptyBucket();
    const operational = airportPages.get(spot.landingPage) || emptyBucket();
    return {
      ...spot,
      ...decorate(attributed, spot.landingPage),
      operationalCompletedBookings: operational.completedBookings,
      operationalGmv: operational.gmv,
      attributionNote: attributed.bookingStarts
        ? "SEO-attributed bookings in the 7-day landing window."
        : "No SEO-attributed bookings in this period. Operational trip-field counts below are not landing-page attribution."
    };
  });

  const noindexReport = noindexPaths.map((url) => {
    const gsc = gscByPage.get(url);
    const attributed = attributedPages.get(url) || emptyBucket();
    const sessions = sessionsByPage.get(url) || 0;
    const starts = startsByPage.get(url) || attributed.bookingStarts;
    const impressions = gscConnected && gsc ? gsc.impressions : null;
    const clicks = gscConnected && gsc ? gsc.clicks : null;
    return {
      url,
      ...parseLandingMeta(url),
      impressions: gscConnected && gsc ? { available: true, value: gsc.impressions } : unavailable(gscConnected ? "not in GSC for this range" : "GSC DATA NOT CONNECTED"),
      clicks: gscConnected && gsc ? { available: true, value: gsc.clicks } : unavailable(gscConnected ? "not in GSC for this range" : "GSC DATA NOT CONNECTED"),
      ctr: gscConnected && gsc ? { available: true, value: gsc.ctr } : unavailable(gscConnected ? "not in GSC for this range" : "GSC DATA NOT CONNECTED"),
      position: gscConnected && gsc ? { available: true, value: gsc.position } : unavailable(gscConnected ? "not in GSC for this range" : "GSC DATA NOT CONNECTED"),
      seoViews: { available: true, value: sessions },
      bookingStarts: { available: true, value: starts },
      bookings: { available: true, value: attributed.completedBookings },
      completedBookings: { available: true, value: attributed.completedBookings },
      gmv: { available: true, value: attributed.gmv, label: "booking_fare_gmv" },
      currentStatus: "noindex,follow",
      recommendation: recommendIndexReview({
        impressions,
        clicks,
        completedBookings: attributed.completedBookings,
        gmv: attributed.gmv
      }),
      indexationUnchanged: true
    };
  });

  const vendorExpansion = [...operationalCities.entries()].map(([city, bucket]) => {
    const listings = cabCountByCity.get(city) || 0;
    let cityImpressions = 0;
    let cityGscFound = false;
    if (gscConnected) {
      for (const [page, row] of gscByPage) {
        if (parseLandingMeta(page).city === city) {
          cityImpressions += row.impressions;
          cityGscFound = true;
        }
      }
    }
    return {
      city,
      operationalCompletedBookings: bucket.completedBookings,
      operationalGmv: bucket.gmv,
      activeCabListings: listings,
      gscImpressions: cityGscFound
        ? { available: true, value: cityImpressions }
        : unavailable(gscConnected ? "not in GSC for this range" : "GSC DATA NOT CONNECTED"),
      recommendation: recommendVendors({
        completedBookings: bucket.completedBookings,
        activeCabListings: listings,
        gscImpressionsAvailable: cityGscFound
      })
    };
  }).sort((a, b) => b.operationalCompletedBookings - a.operationalCompletedBookings);

  const queryEmpty = {
    status: "GSC DATA NOT CONNECTED",
    topByClicks: [],
    topByImpressions: [],
    topByAttributedBookings: [],
    highImpressionsLowCtr: [],
    highCommercialIntentQueries: []
  };
  const queries = !gscConnected
    ? queryEmpty
    : {
        status: selectedGsc.status,
        topByClicks: [...gscByKeyword].sort((a, b) => b.clicks - a.clicks).slice(0, 20),
        topByImpressions: [...gscByKeyword].sort((a, b) => b.impressions - a.impressions).slice(0, 20),
        topByAttributedBookings: gscByKeyword
          .map((q) => {
            const bucket = attributedPages.get(q.landingPage) || emptyBucket();
            return {
              ...q,
              attributedCompletedBookings: bucket.completedBookings,
              attributedGmv: bucket.gmv
            };
          })
          .filter((q) => q.attributedCompletedBookings > 0)
          .sort((a, b) => b.attributedCompletedBookings - a.attributedCompletedBookings)
          .slice(0, 20),
        highImpressionsLowCtr: gscByKeyword
          .filter((q) => q.impressions >= 50 && q.ctr < 0.03)
          .sort((a, b) => b.impressions - a.impressions)
          .slice(0, 20),
        highCommercialIntentQueries: gscByKeyword
          .filter((q) => /taxi|cab|airport|acting.?driver|outstation|tempo|rental|pilgrim|one.?way|hourly/i.test(q.keyword || ""))
          .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions)
          .slice(0, 20)
      };

  const topAttributedByBookings = sortTop(attributedPages, 20).map((r) => decorate(r, r.key));
  const topAttributedByGmv = sortTopGmv(attributedPages, 20).map((r) => decorate(r, r.key));

  const pageKeys = new Set([...sessionsByPage.keys(), ...attributedPages.keys(), ...gscByPage.keys()]);
  const pagePerformance = [...pageKeys]
    .map((page) => decorate(attributedPages.get(page) || emptyBucket(), page))
    .sort((a, b) => {
      const ac = a.clicks?.available ? a.clicks.value : -1;
      const bc = b.clicks?.available ? b.clicks.value : -1;
      return bc - ac || b.completedBookings - a.completedBookings;
    })
    .slice(0, 100);

  const highImpressionsLowCtrPages = gscConnected
    ? [...gscByPage.entries()]
        .filter(([, row]) => row.impressions >= 50 && row.ctr < 0.03)
        .sort((a, b) => b[1].impressions - a[1].impressions)
        .slice(0, 10)
        .map(([page, row]) => ({ landingPage: page, impressions: row.impressions, ctr: row.ctr, clicks: row.clicks }))
    : [];

  const highClicksLowBookings = gscConnected
    ? [...gscByPage.entries()]
        .map(([page, row]) => ({
          landingPage: page,
          clicks: row.clicks,
          completedBookings: (attributedPages.get(page) || emptyBucket()).completedBookings,
          note: "GSC clicks are demand, not a conversion rate."
        }))
        .filter((r) => r.clicks >= 10 && r.completedBookings <= 1)
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 10)
    : [];

  const highTrafficLowBookings = [];
  const lowTrafficHighConversion = [];
  for (const page of pageKeys) {
    const bucket = attributedPages.get(page) || emptyBucket();
    const sessions = sessionsByPage.get(page) || 0;
    if (sessions >= 10 && bucket.completedBookings <= 1) {
      highTrafficLowBookings.push({
        landingPage: page,
        traffic: sessions,
        trafficSource: "first_party_seo_sessions",
        completedBookings: bucket.completedBookings,
        gmv: bucket.gmv
      });
    }
    const conv = rateOrNA(bucket.completedBookings, sessions);
    if (sessions > 0 && sessions <= 15 && conv.available && conv.value >= 0.2) {
      lowTrafficHighConversion.push({
        landingPage: page,
        traffic: sessions,
        trafficSource: "first_party_seo_sessions",
        completedBookings: bucket.completedBookings,
        conversion: conv,
        gmv: bucket.gmv
      });
    }
  }
  highTrafficLowBookings.sort((a, b) => b.traffic - a.traffic);
  lowTrafficHighConversion.sort((a, b) => (b.conversion.value || 0) - (a.conversion.value || 0));

  const highDemandLowSupply = vendorExpansion
    .filter((v) => v.recommendation === "ADD VENDORS" || (v.gscImpressions?.available && v.gscImpressions.value >= 100 && v.activeCabListings <= 1))
    .slice(0, 10);

  const cityRows = sortTop(operationalCities, 20).map((r) => ({
    city: r.key,
    seoTraffic: unavailable("GA4 not connected"),
    bookings: r.completedBookings,
    gmv: r.gmv,
    avgBooking: avgGmv(r),
    conversion: unavailable("SEO sessions not joined to operational city rows")
  }));

  const serviceRows = sortTop(operationalServices, 20).map((r) => ({
    service: r.key,
    seoTraffic: unavailable("GA4 not connected"),
    bookings: r.completedBookings,
    gmv: r.gmv,
    avgBooking: avgGmv(r),
    conversion: unavailable("SEO sessions not joined to operational service rows")
  }));

  const routeRows = FEATURED_ROUTES.map((path) => {
    const bucket = operationalRoutes.get(path) || attributedPages.get(path) || emptyBucket();
    return { route: path, ...decorate(bucket, path) };
  }).sort((a, b) => b.completedBookings - a.completedBookings);

  return {
    period: {
      label: period.label,
      from: period.start.toISOString(),
      to: period.end.toISOString(),
      days: period.days,
      bookingRange: gscRange.booking,
      gscRange: gscRange.gsc,
      rangesDiffer: gscRange.rangesDiffer,
      rangeWarning: gscRange.warning
    },
    sources: {
      ga4: { status: "NOT CONNECTED", detail: "No GA4 property ID / Data API in env. seo_page_view is client dataLayer/gtag only when GTM is installed." },
      gsc: {
        status: gscConnected ? selectedGsc.status : "NOT CONNECTED",
        configured: gscStatus.configured,
        property: gscStatus.property,
        canonicalOrigin: gscStatus.canonicalOrigin,
        credentialSource: gscStatus.credentialSource,
        rangeMatch: selectedGsc.rangeMatch,
        setupRequirement: gscStatus.setupRequirement,
        detail: gscConnected
          ? selectedGsc.status === "GSC_API"
            ? `Search Console API rows for ${gscRange.gsc.start} → ${gscRange.gsc.end}.`
            : "Imported/manual snapshots. They may not match the booking date filter."
          : gscStatus.configured
            ? "GSC API is configured. Sync this date range to pull rows. GSC DATA NOT CONNECTED for the selected period until then."
            : "GSC DATA NOT CONNECTED"
      },
      bookings: { status: "CONNECTED", detail: "Mongo Booking documents. Bus/hotel excluded." },
      firstPartySeoEvents: { status: "CONNECTED", detail: "SeoEvent collection from landing beacons. Historical rows start empty until Phase 3 traffic is recorded." },
      moneyField: {
        label: "booking_fare_gmv",
        detail: "Sum of finalAmount (fallback amount) for status confirmed or finished. Not commission, not profit, not published tariff."
      },
      cabziiCommission: unavailable("No commission/payout field on Booking"),
      vendorPayout: unavailable("No vendor payout field on Booking")
    },
    attribution: {
      method: "Last SEO landing stored in browser sessionStorage, copied onto Booking.seoAttribution at create if viewedAt is within the window. Bookings without that field are not attributed to an SEO URL.",
      window: ATTRIBUTION_WINDOW_LABEL,
      doNotInferFromPickup: true,
      gscClicksAreNotSessions: true,
      conversionWarning: "SEO conversion uses first-party seo_page_view sessions, not GSC clicks."
    },
    totals: {
      operationalBookingStarts: operationalStarts,
      operationalCompletedBookings: operationalCompleted,
      operationalGmv: operationalGmv,
      attributedBookingStarts: attributedStarts,
      attributedCompletedBookings: attributedCompleted,
      attributedGmv: attributedGmv,
      truncated
    },
    spotlight,
    pagePerformance,
    topSeoPagesByCompletedBookings: topAttributedByBookings,
    topSeoPagesByGmv: topAttributedByGmv,
    topCities: cityRows,
    topServices: serviceRows,
    topRoutes: routeRows,
    topAirportPages: sortTop(airportPages, 20).map((r) => decorate(r, r.key)),
    actingDriverPerformance: sortTop(actingPages, 20).map((r) => decorate(r, r.key)),
    tourPilgrimagePerformance: sortTop(new Map([...tourPages, ...pilgrimagePages]), 20).map((r) => decorate(r, r.key)),
    noindexReport,
    vendorExpansion,
    queries,
    opportunities: {
      highImpressionsLowCtr: highImpressionsLowCtrPages,
      highClicksLowBookings,
      lowTrafficHighConversion: lowTrafficHighConversion.slice(0, 10),
      highBookingsHighGmv: topAttributedByGmv.slice(0, 10).map((r) => ({
        landingPage: r.landingPage,
        completedBookings: r.completedBookings,
        gmv: r.gmv
      })),
      highDemandLowSupply
    },
    insights: insights.map((i) => ({
      id: String(i._id),
      landingPage: i.landingPage,
      vendorSupplyNote: i.vendorSupplyNote,
      investFlag: i.investFlag,
      recommendation: i.recommendation,
      notes: i.notes
    })),
    decisions: {
      note: "Invest lists use operational bookings, SEO-attributed GMV, first-party sessions, imported GSC (if any), and admin insight flags. They are not Google volumes or commercialScore.",
      investCities: cityRows.slice(0, 10).map((c) => ({
        city: c.city,
        bookings: c.bookings,
        gmv: c.gmv
      })),
      investServices: serviceRows.slice(0, 10).map((s) => ({
        service: s.service,
        bookings: s.bookings,
        gmv: s.gmv
      })),
      investRoutes: routeRows.slice(0, 20).map((r) => ({
        route: r.route,
        bookings: r.completedBookings,
        gmv: r.gmv?.value ?? r.gmv
      })),
      pagesToImprove: [
        ...insights.filter((i) => i.recommendation === "improve_content").map((i) => i.landingPage),
        ...highTrafficLowBookings.map((p) => p.landingPage)
      ]
        .filter((v, i, a) => a.indexOf(v) === i)
        .slice(0, 10),
      highTrafficLowBookings: highTrafficLowBookings.slice(0, 10),
      highClicksLowBookings,
      lowTrafficHighConversion: lowTrafficHighConversion.slice(0, 10),
      highGmvAttributed: topAttributedByGmv.slice(0, 10).map((r) => ({
        landingPage: r.landingPage,
        completedBookings: r.completedBookings,
        gmv: r.gmv
      })),
      addVendors: vendorExpansion.filter((v) => v.recommendation === "ADD VENDORS").slice(0, 10)
    }
  };
}

const reportCache = new Map();
const REPORT_CACHE_MS = 60 * 1000;

async function getSeoRevenueReport(query) {
  const key = JSON.stringify({
    days: query.days || "",
    from: query.from || "",
    to: query.to || ""
  });
  const hit = reportCache.get(key);
  if (hit && Date.now() - hit.at < REPORT_CACHE_MS) return hit.data;
  const data = await buildSeoRevenueReport(query);
  reportCache.set(key, { at: Date.now(), data });
  return data;
}

function invalidateSeoRevenueCache() {
  reportCache.clear();
}

module.exports = {
  buildSeoRevenueReport,
  getSeoRevenueReport,
  invalidateSeoRevenueCache,
  FEATURED_SPOTLIGHT
};
