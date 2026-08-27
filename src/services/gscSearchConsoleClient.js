"use strict";

const crypto = require("crypto");
const { getGscConfig } = require("../utils/gscConfig");

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

let tokenCache = { accessToken: "", expiresAt: 0 };

function b64url(value) {
  return Buffer.from(value).toString("base64url");
}

function signServiceAccountJwt(email, privateKey) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(
    JSON.stringify({
      iss: email,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600
    })
  );
  const unsigned = `${header}.${payload}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsigned);
  const sig = signer.sign(privateKey, "base64url");
  return `${unsigned}.${sig}`;
}

async function getAccessToken() {
  const cfg = getGscConfig();
  if (!cfg.configured) {
    const err = new Error("GSC DATA NOT CONNECTED");
    err.code = "GSC_NOT_CONFIGURED";
    throw err;
  }
  if (tokenCache.accessToken && tokenCache.expiresAt > Date.now() + 30_000) {
    return tokenCache.accessToken;
  }
  const assertion = signServiceAccountJwt(cfg.clientEmail, cfg.privateKey);
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.access_token) {
    const err = new Error(json.error_description || json.error || "GSC token request failed.");
    err.code = "GSC_AUTH_FAILED";
    throw err;
  }
  tokenCache = {
    accessToken: json.access_token,
    expiresAt: Date.now() + (Number(json.expires_in) || 3600) * 1000
  };
  return tokenCache.accessToken;
}

function clearGscTokenCache() {
  tokenCache = { accessToken: "", expiresAt: 0 };
}

async function querySearchAnalytics({ startDate, endDate, dimensions, rowLimit = 25000 }) {
  const cfg = getGscConfig();
  const token = await getAccessToken();
  const site = encodeURIComponent(cfg.property);
  const url = `https://www.googleapis.com/webmasters/v3/sites/${site}/searchAnalytics/query`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      startDate,
      endDate,
      dimensions,
      rowLimit,
      dataState: "final"
    })
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json.error?.message || json.error_description || "GSC searchAnalytics query failed.");
    err.code = "GSC_QUERY_FAILED";
    err.status = res.status;
    throw err;
  }
  return Array.isArray(json.rows) ? json.rows : [];
}

module.exports = { querySearchAnalytics, getAccessToken, clearGscTokenCache };
