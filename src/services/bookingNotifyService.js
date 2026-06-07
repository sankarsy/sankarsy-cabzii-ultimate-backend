"use strict";

const { env } = require("../config/env");

async function postFast2sms(payload) {
  if (!env.fast2smsApiKey) return { ok: false, skipped: true };
  try {
    const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
      method: "POST",
      headers: {
        authorization: env.fast2smsApiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const text = await response.text();
    let body = {};
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text };
    }
    const ok = body?.return === true || body?.return === "true" || String(body?.status_code) === "200";
    return { ok, body };
  } catch {
    return { ok: false };
  }
}

function buildConfirmMessage(booking, contact) {
  const pickup = booking.pickup || "your pickup";
  const date = booking.date ? ` on ${booking.date}` : "";
  const name = contact?.name || "your driver/partner";
  const phone = contact?.phone || contact?.whatsapp || "";
  const phonePart = phone ? ` Call ${phone}.` : "";
  return `Cabzii booking confirmed${date} for ${pickup}. Contact: ${name}.${phonePart} View details in My Bookings on cabzii.in`;
}

async function notifyCustomerBookingConfirmed(booking, contact) {
  const mobile = String(booking?.phone || "").replace(/\D/g, "");
  if (mobile.length < 10) return { ok: false, skipped: true };

  const message = buildConfirmMessage(booking, contact);
  return postFast2sms({
    route: "q",
    message,
    language: "english",
    numbers: mobile.slice(-10)
  });
}

module.exports = { notifyCustomerBookingConfirmed };
