"use strict";

const fs = require("fs");
const { DEFAULT_CANONICAL_ORIGIN } = require("./gscCanonical");

const SETUP_REQUIREMENT = [
  "Create a Google Cloud service account with the Search Console API enabled.",
  "Add that service account email as a user on the Search Console property (Full or Restricted).",
  "Set GSC_SITE_URL to the exact property string from Search Console (do not guess).",
  "Possible property values: https://www.cabzii.in/  OR  https://cabzii.in/  OR  sc-domain:cabzii.in",
  "Frontend canonical origin in code is https://www.cabzii.in — set GSC_CANONICAL_ORIGIN to match.",
  "Credentials: GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json  OR  GSC_SERVICE_ACCOUNT_JSON  OR  GSC_CLIENT_EMAIL + GSC_PRIVATE_KEY.",
  "Never put the private key in frontend env, git, or public pages."
];

function parseJson(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function loadServiceAccount() {
  const inline = process.env.GSC_SERVICE_ACCOUNT_JSON || "";
  const fromInline = parseJson(inline);
  if (fromInline?.client_email && fromInline?.private_key) {
    return { json: fromInline, source: "GSC_SERVICE_ACCOUNT_JSON" };
  }

  const path =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.GSC_SERVICE_ACCOUNT_JSON_PATH ||
    "";
  if (path) {
    try {
      const fromFile = parseJson(fs.readFileSync(path, "utf8"));
      if (fromFile?.client_email && fromFile?.private_key) {
        return { json: fromFile, source: "GOOGLE_APPLICATION_CREDENTIALS" };
      }
    } catch {
      return { json: null, source: "unreadable_credentials_file" };
    }
  }

  const email = String(process.env.GSC_CLIENT_EMAIL || "").trim();
  let key = String(process.env.GSC_PRIVATE_KEY || "").trim();
  if (key.includes("\\n")) key = key.replace(/\\n/g, "\n");
  if (email && key) {
    return { json: { client_email: email, private_key: key }, source: "GSC_CLIENT_EMAIL" };
  }

  return { json: null, source: "none" };
}

function getGscConfig() {
  const loaded = loadServiceAccount();
  const property = String(process.env.GSC_SITE_URL || "").trim();
  const canonicalOrigin = String(process.env.GSC_CANONICAL_ORIGIN || DEFAULT_CANONICAL_ORIGIN).trim();
  return {
    configured: Boolean(loaded.json && property),
    property: property || "NOT CONFIGURED",
    canonicalOrigin,
    clientEmail: loaded.json?.client_email || "",
    privateKey: loaded.json?.private_key || "",
    credentialSource: loaded.source
  };
}

function publicGscStatus() {
  const cfg = getGscConfig();
  return {
    configured: cfg.configured,
    property: cfg.property,
    canonicalOrigin: cfg.canonicalOrigin,
    credentialSource: cfg.credentialSource,
    clientEmail: cfg.clientEmail,
    setupRequirement: SETUP_REQUIREMENT,
    note: cfg.configured
      ? "API credentials are present server-side. Sync a date range to pull Search Console rows."
      : "GSC DATA NOT CONNECTED"
  };
}

module.exports = { getGscConfig, publicGscStatus, SETUP_REQUIREMENT };
