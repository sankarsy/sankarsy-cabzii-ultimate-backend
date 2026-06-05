const { env } = require("../config/env");

/** Client login OTP — always 6 digits (matches Cabzii.in UI). */
function generateOtp() {
  const min = 100000;
  const max = 999999;
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

class OtpSendError extends Error {
  constructor(message, { userMessage, providerBody } = {}) {
    super(message);
    this.name = "OtpSendError";
    this.userMessage = userMessage || message;
    this.providerBody = providerBody;
  }
}

async function parseFast2smsResponse(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function isFast2smsSuccess(body) {
  if (!body || typeof body !== "object") return false;
  if (body.return === true || body.return === "true") return true;
  if (String(body.status_code) === "200" || body.status === "OK") return true;
  return false;
}

function fast2smsErrorMessage(body, fallback) {
  return (
    body?.message ||
    body?.msg ||
    (typeof body?.raw === "string" ? body.raw : null) ||
    fallback
  );
}

async function postFast2sms(payload) {
  const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
    method: "POST",
    headers: {
      authorization: env.fast2smsApiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  const body = await parseFast2smsResponse(response);
  console.log("Fast2SMS Response:", JSON.stringify(body));
  console.log("Fast2SMS Request ID:", body.request_id);
  return { response, body };
}

/** Legacy Cabzii flow: Fast2SMS Quick SMS route "q" with plain English message. */
async function sendViaFast2smsQuick(mobileNumber, otp) {
  const minutes = env.otpTtlMinutes;
  const message = env.fast2smsQuickMessage
    .replace("{otp}", otp)
    .replace("{minutes}", String(minutes));

  const { response, body } = await postFast2sms({
    route: "q",
    message,
    language: "english",
    flash: 0,
    numbers: mobileNumber
  });

  if (isFast2smsSuccess(body)) {
    return { provider: "fast2sms", channel: "quick" };
  }

  const providerMessage = fast2smsErrorMessage(body, "Failed to send OTP via SMS");
  console.error("[OTP] Fast2SMS quick route failed", { status: response.status, body, mobileNumber });
  throw new OtpSendError(providerMessage, { userMessage: providerMessage, providerBody: body });
}

async function sendViaFast2smsOtpRoute(mobileNumber, otp) {
  const { response, body } = await postFast2sms({
    route: "otp",
    variables_values: otp,
    numbers: mobileNumber
  });

  if (isFast2smsSuccess(body)) {
    return { provider: "fast2sms", channel: "otp" };
  }

  const providerMessage = fast2smsErrorMessage(body, "Failed to send OTP via SMS");
  console.error("[OTP] Fast2SMS OTP route failed", { status: response.status, body, mobileNumber });
  throw new OtpSendError(providerMessage, { userMessage: providerMessage, providerBody: body });
}

async function sendViaFast2smsDlt(mobileNumber, otp) {
  const message = env.fast2smsOtpMessage.replace("{otp}", otp);
  const payload = {
    route: "dlt",
    sender_id: env.fast2smsSenderId,
    message,
    variables_values: otp,
    flash: "0",
    numbers: mobileNumber
  };

  if (env.fast2smsEntityId) {
    payload.entity_id = env.fast2smsEntityId;
  }
  if (env.fast2smsTemplateId) {
    payload.template_id = env.fast2smsTemplateId;
  }

  const { response, body } = await postFast2sms(payload);
  if (!isFast2smsSuccess(body)) {
    const providerMessage = fast2smsErrorMessage(body, "DLT SMS failed");
    throw new OtpSendError(providerMessage, { userMessage: providerMessage, providerBody: body });
  }

  return { provider: "fast2sms", channel: "dlt" };
}

async function sendViaFactor2(mobileNumber, otp) {
  if (!env.factor2ApiKey) {
    throw new OtpSendError("FACTOR2_API_KEY is missing", {
      userMessage: "SMS service is not configured."
    });
  }

  const url = `https://2factor.in/API/V1/${env.factor2ApiKey}/SMS/${mobileNumber}/${otp}/${env.factor2TemplateName}`;
  const response = await fetch(url, { method: "GET" });
  if (!response.ok) {
    throw new OtpSendError("2Factor request failed", { userMessage: "Failed to send OTP via SMS." });
  }
  return { provider: "factor2" };
}

async function sendViaFast2sms(mobileNumber, otp) {
  if (!env.fast2smsApiKey) {
    throw new OtpSendError("SMS service is not configured", {
      userMessage: "SMS service is not configured. Set FAST2SMS_API_KEY or use OTP_MODE=local."
    });
  }

  try {
    return await sendViaFast2smsQuick(mobileNumber, otp);
  } catch (quickErr) {
    console.warn("[OTP] Quick SMS failed, trying OTP route", { message: quickErr.message, mobileNumber });
  }

  try {
    return await sendViaFast2smsOtpRoute(mobileNumber, otp);
  } catch (otpRouteErr) {
    if (env.fast2smsTemplateId && env.fast2smsSenderId) {
      try {
        return await sendViaFast2smsDlt(mobileNumber, otp);
      } catch (dltErr) {
        console.error("[OTP] Fast2SMS DLT fallback failed", { message: dltErr.message, mobileNumber });
        throw dltErr;
      }
    }
    throw otpRouteErr;
  }
}

async function sendOtp(mobileNumber, otp) {
  if (env.otpMode === "local") {
    console.log(`[LOCAL OTP] ${mobileNumber} => ${otp}`);
    return { provider: "local" };
  }

  if (env.otpMode === "fast2sms") {
    return sendViaFast2sms(mobileNumber, otp);
  }

  if (env.otpMode === "factor2") {
    return sendViaFactor2(mobileNumber, otp);
  }

  console.log(`[LOCAL OTP] ${mobileNumber} => ${otp} (unknown OTP_MODE="${env.otpMode}")`);
  return { provider: "local" };
}

module.exports = { generateOtp, sendOtp, OtpSendError };
