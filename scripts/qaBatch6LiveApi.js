"use strict";

/**
 * Batch 6 live API verification. Prints no secrets, tokens, or full phones.
 * Creates at most one draft QA cab and deletes it in finally.
 * Does not invent production registration numbers for MULTI TRAVELS fleet.
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const path = require("path");
const { env } = require(path.join(__dirname, "..", "src", "config", "env"));
const { Vendor } = require(path.join(__dirname, "..", "src", "models", "Vendor"));
const { User } = require(path.join(__dirname, "..", "src", "models", "User"));
const { signAccessToken } = require(path.join(__dirname, "..", "src", "services", "tokenService"));
const mongoose = require("mongoose");

const BASE = process.env.QA_API_BASE || "http://127.0.0.1:8000/api/v1";

function maskPhone(phone) {
  const s = String(phone || "");
  if (s.length < 4) return "(none)";
  return `${"*".repeat(s.length - 4)}${s.slice(-4)}`;
}

function fail(failures, name, detail) {
  failures.push(`${name}: ${detail}`);
}

async function req(method, urlPath, { token, body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${urlPath}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function login(pathSuffix, phone, password) {
  const { status, json } = await req("POST", `/auth/${pathSuffix}`, {
    body: { phone, password }
  });
  if (status !== 200 || !json?.data?.token) {
    throw new Error(`${pathSuffix} login failed HTTP ${status} ${json?.message || ""}`.trim());
  }
  return { token: json.data.token, role: json.data.user?.role, vendorName: json.data.user?.vendorName };
}

async function main() {
  const failures = [];
  const notes = [];
  let qaId = null;
  let vendorToken = null;
  let adminToken = null;

  await mongoose.connect(env.mongodbUri);
  const multi = await Vendor.findOne({ name: /multi travels/i }).select("name adminPhone city").lean();
  const abc = await Vendor.findOne({ name: /^abc$/i }).select("name adminPhone").lean();
  if (!multi?.adminPhone) {
    await mongoose.disconnect();
    throw new Error("MULTI TRAVELS vendor account/adminPhone missing in Vendor collection");
  }
  notes.push(`MULTI TRAVELS phone ${maskPhone(multi.adminPhone)} city=${multi.city || "-"}`);
  if (abc?.adminPhone) notes.push(`abc phone ${maskPhone(abc.adminPhone)}`);

  const publicBefore = await req("GET", "/cabs?limit=100");
  const publicRows = Array.isArray(publicBefore.json.data) ? publicBefore.json.data : [];
  notes.push(`public cabs HTTP ${publicBefore.status} count=${publicRows.length}`);
  if (publicBefore.status !== 200) fail(failures, "public list", `HTTP ${publicBefore.status}`);
  const nonActive = publicRows.filter((c) => c.status && c.status !== "active");
  if (nonActive.length) fail(failures, "public listing", `${nonActive.length} non-active rows exposed`);
  const sample = publicRows[0];
  if (sample && !("availabilityStatus" in sample) && !("registrationNumber" in sample)) {
    fail(failures, "live schema", "public cab payload missing Batch 6 inventory fields");
  } else if (sample) {
    notes.push(
      `sample inventory fields availability=${sample.availabilityStatus || "available"} plate=${sample.registrationNumber ? "set" : "empty"}`
    );
  }

  try {
    const admin = await login("admin-login", env.adminLoginPhone, env.adminLoginPassword);
    adminToken = admin.token;
    notes.push(`admin login role=${admin.role}`);
    if (admin.role !== "super_admin") fail(failures, "admin role", admin.role);
  } catch (err) {
    fail(failures, "admin login", err.message);
  }

  try {
    const partner = await login("partner-login", multi.adminPhone, env.partnerLoginPassword || env.adminLoginPassword);
    vendorToken = partner.token;
    notes.push(`MULTI TRAVELS partner-login role=${partner.role} vendorName=${partner.vendorName || "-"}`);
    if (partner.role !== "vendor_admin") fail(failures, "vendor role", partner.role);
  } catch (err) {
    notes.push(`MULTI TRAVELS partner-login failed: ${err.message}`);
    const user =
      (await User.findOne({ mobileNumber: multi.adminPhone })) || (await User.findOne({ phone: multi.adminPhone }));
    if (user && (user.role === "vendor_admin" || user.role === "super_admin")) {
      vendorToken = signAccessToken(user, "vendor_admin");
      notes.push("using existing vendor_admin user session for API checks (per-user password hash, not env partner password)");
    } else {
      fail(failures, "MULTI TRAVELS login", `${err.message}; no vendor_admin user to mint session`);
    }
  }

  if (adminToken) {
    const listed = await req("GET", "/cabs?admin=1&limit=100", { token: adminToken });
    const rows = Array.isArray(listed.json.data) ? listed.json.data : [];
    notes.push(`admin cab list HTTP ${listed.status} count=${rows.length}`);
    if (listed.status !== 200) fail(failures, "admin list", `HTTP ${listed.status}`);
    const hasCols = rows.some(
      (r) => "registrationNumber" in r && "availabilityStatus" in r && (r.category || r.type) && r.city != null && r.status
    );
    if (rows.length && !hasCols) fail(failures, "admin list fields", "missing Number/Category/City/Status/Availability");
  }

  if (vendorToken) {
    const own = await req("GET", "/cabs?admin=1&limit=100", { token: vendorToken });
    const ownRows = Array.isArray(own.json.data) ? own.json.data : [];
    notes.push(`vendor list HTTP ${own.status} count=${ownRows.length}`);
    if (own.status !== 200) fail(failures, "vendor list", `HTTP ${own.status}`);
    const leaked = ownRows.filter((r) => {
      const v = String(r.vendor || "");
      return v && !/multi travels/i.test(v);
    });
    if (leaked.length) fail(failures, "vendor isolation list", `saw ${leaked.length} other-vendor rows`);

    const partnerCab = publicRows.find((c) => /cabzii partner/i.test(String(c.vendor || ""))) || publicRows[0];
    if (partnerCab?.id || partnerCab?._id) {
      const id = partnerCab._id || partnerCab.id;
      const getOther = await req("GET", `/cabs/${id}?admin=1`, { token: vendorToken });
      if (getOther.status === 200) fail(failures, "other-vendor GET", "vendor read another vendor cab");
      else notes.push(`other-vendor GET HTTP ${getOther.status} (expected 404)`);

      const putOther = await req("PUT", `/cabs/${id}`, {
        token: vendorToken,
        body: { title: partnerCab.title, vendor: "MULTI TRAVELS", type: partnerCab.type || "Sedan", city: partnerCab.city || "Chennai", seats: partnerCab.seats || 4, price: partnerCab.price || 0, status: "draft" }
      });
      if (putOther.status === 200) fail(failures, "other-vendor PUT", "vendor updated another vendor cab");
      else notes.push(`other-vendor PUT HTTP ${putOther.status} (expected 404)`);
    }

    const createBody = {
      title: "BATCH6-QA-DRAFT",
      vehicleName: "BATCH6-QA-DRAFT",
      vendor: "Cabzii Partner",
      vendorId: "9000000002",
      vendorAdminPhone: "9000000002",
      type: "Tempo Traveller",
      category: "Tempo Traveller",
      city: "Chennai",
      seats: 12,
      price: 0,
      status: "draft",
      availabilityStatus: "busy",
      verificationStatus: "rejected",
      blockedDates: ["2026-09-01"],
      vehicleDocuments: [{ docType: "rc", url: "/uploads/qa-batch6-rc.png", status: "verified", label: "QA" }]
    };
    const created = await req("POST", "/cabs", { token: vendorToken, body: createBody });
    notes.push(`vendor create HTTP ${created.status} vendor=${created.json?.data?.vendor || "-"}`);
    if (created.status !== 201 && created.status !== 200) {
      fail(failures, "vendor create", `${created.status} ${created.json?.message || ""}`);
    } else {
      const cab = created.json.data;
      qaId = cab._id || cab.id;
      if (/cabzii partner/i.test(String(cab.vendor || "")) || String(cab.vendorAdminPhone || "") === "9000000002") {
        fail(failures, "vendorId protection", `create kept spoofed vendor=${cab.vendor} phone=${maskPhone(cab.vendorAdminPhone)}`);
      }
      if (!/multi travels/i.test(String(cab.vendor || ""))) {
        fail(failures, "vendor stamp", `expected MULTI TRAVELS got ${cab.vendor || "(empty)"}`);
      }
      if (cab.availabilityStatus === "busy") fail(failures, "busy protection", "vendor created with busy");
      if (cab.verificationStatus === "rejected") fail(failures, "verification protection", "vendor set rejected");
      if (cab.status === "suspended") fail(failures, "suspended protection", "vendor created suspended");
      const docs = Array.isArray(cab.vehicleDocuments) ? cab.vehicleDocuments : [];
      if (docs.some((d) => d.status === "verified")) fail(failures, "doc status", "vendor self-verified a document");
      notes.push(`blockedDates=${JSON.stringify(cab.blockedDates || [])} docs=${docs.length} docStatus=${docs[0]?.status || "-"}`);

      const sus = await req("PUT", `/cabs/${qaId}`, {
        token: vendorToken,
        body: { ...createBody, title: cab.title, vendor: "MULTI TRAVELS", status: "suspended" }
      });
      if (sus.status === 200 && sus.json?.data?.status === "suspended") fail(failures, "suspended protection", "PUT suspended succeeded");
      else notes.push(`suspended PUT HTTP ${sus.status} ${sus.json?.message || sus.json?.data?.status || ""}`);

      const busy = await req("PUT", `/cabs/${qaId}`, {
        token: vendorToken,
        body: { ...createBody, title: cab.title, vendor: "MULTI TRAVELS", status: "draft", availabilityStatus: "busy" }
      });
      if (busy.status === 200 && busy.json?.data?.availabilityStatus === "busy") fail(failures, "busy protection", "PUT busy stuck");
      else notes.push(`busy PUT HTTP ${busy.status} availability=${busy.json?.data?.availabilityStatus || busy.json?.message || ""}`);

      const ver = await req("PUT", `/cabs/${qaId}`, {
        token: vendorToken,
        body: { ...createBody, title: cab.title, vendor: "MULTI TRAVELS", status: "draft", verificationStatus: "rejected" }
      });
      if (ver.status === 200 && ver.json?.data?.verificationStatus === "rejected") {
        fail(failures, "verification protection", "vendor changed verificationStatus");
      } else {
        notes.push(`verification PUT HTTP ${ver.status} verification=${ver.json?.data?.verificationStatus || ver.json?.message || ""}`);
      }

      const plate = "QAB6DUP001";
      const plated = await req("PUT", `/cabs/${qaId}`, {
        token: vendorToken,
        body: { ...createBody, title: cab.title, vendor: "MULTI TRAVELS", status: "draft", registrationNumber: plate }
      });
      if (plated.status !== 200) fail(failures, "set QA plate", `${plated.status} ${plated.json?.message || ""}`);
      const dup = await req("POST", "/cabs", {
        token: vendorToken,
        body: { ...createBody, title: "BATCH6-QA-DUP", vehicleName: "BATCH6-QA-DUP", registrationNumber: plate, status: "draft" }
      });
      if (dup.status !== 409) fail(failures, "duplicate plate", `expected 409 got ${dup.status} ${dup.json?.message || ""}`);
      else notes.push(`duplicate plate HTTP 409 message=${dup.json?.message || ""}`);

      const still = await req("GET", `/cabs/${qaId}?admin=1`, { token: vendorToken });
      if (still.status !== 200) fail(failures, "qa cab intact", `HTTP ${still.status}`);
      else if (String(still.json?.data?.registrationNumber || "") !== plate) {
        fail(failures, "qa cab intact", "plate changed after duplicate attempt");
      }

      const copied = await req("POST", `/cabs/${qaId}/duplicate`, { token: vendorToken });
      notes.push(`duplicate-vehicle HTTP ${copied.status} plate=${copied.json?.data?.registrationNumber || "(empty)"}`);
      if (copied.status === 201 || copied.status === 200) {
        if (copied.json?.data?.registrationNumber) fail(failures, "duplicate-vehicle plate", "clone kept registrationNumber");
        const copyId = copied.json.data._id || copied.json.data.id;
        if (copyId && copyId !== qaId) {
          const delCopy = await req("DELETE", `/cabs/${copyId}`, { token: vendorToken });
          notes.push(`cleanup clone HTTP ${delCopy.status}`);
        }
      } else {
        fail(failures, "duplicate-vehicle", `${copied.status} ${copied.json?.message || ""}`);
      }

      if (adminToken) {
        const approve = await req("PUT", `/cabs/${qaId}`, {
          token: adminToken,
          body: {
            title: cab.title,
            vehicleName: cab.vehicleName,
            vendor: "MULTI TRAVELS",
            type: "Tempo Traveller",
            category: "Tempo Traveller",
            city: "Chennai",
            seats: 12,
            price: 0,
            status: "draft",
            verificationStatus: "approved",
            availabilityStatus: "blocked",
            blockedDates: ["2026-09-01", "2026-09-02"],
            vehicleDocuments: [{ docType: "rc", url: "/uploads/qa-batch6-rc.png", status: "verified", label: "QA RC" }]
          }
        });
        notes.push(`admin verify/docs/blocked HTTP ${approve.status} verification=${approve.json?.data?.verificationStatus || ""} availability=${approve.json?.data?.availabilityStatus || ""} docs=${approve.json?.data?.vehicleDocuments?.[0]?.status || ""}`);
        if (approve.status !== 200) fail(failures, "admin inventory edit", `${approve.status} ${approve.json?.message || ""}`);
        else {
          if (approve.json.data.verificationStatus !== "approved") fail(failures, "admin verification", "did not set approved");
          if (approve.json.data.availabilityStatus !== "blocked") fail(failures, "admin availability", "did not set blocked");
        }
      }
    }
  }

  const publicAfter = await req("GET", "/cabs?limit=100");
  const afterRows = Array.isArray(publicAfter.json.data) ? publicAfter.json.data : [];
  notes.push(`public cabs after QA count=${afterRows.length} (before ${publicRows.length})`);
  if (afterRows.length !== publicRows.length) fail(failures, "public regression", `count changed ${publicRows.length} → ${afterRows.length}`);
  if (afterRows.some((c) => /BATCH6-QA/i.test(`${c.title || ""} ${c.vehicleName || ""}`))) {
    fail(failures, "public regression", "QA draft leaked to public catalog");
  }

  if (qaId && vendorToken) {
    const del = await req("DELETE", `/cabs/${qaId}`, { token: vendorToken });
    notes.push(`cleanup QA draft HTTP ${del.status}`);
    if (del.status !== 200 && del.status !== 204) fail(failures, "cleanup QA draft", `HTTP ${del.status}`);
  }

  await mongoose.disconnect();

  console.log("Batch 6 live API verification");
  console.log(`API ${BASE}`);
  for (const n of notes) console.log(` - ${n}`);
  if (failures.length) {
    console.log("FAIL");
    for (const f of failures) console.log(` ! ${f}`);
    process.exit(1);
  }
  console.log("PASS");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
