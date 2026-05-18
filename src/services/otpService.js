const { env } = require("../config/env");

function generateOtp() {
  const min = 10 ** (env.otpLength - 1);
  const max = 10 ** env.otpLength - 1;
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

async function sendViaFast2sms(phone, otp) {
  if (!env.fast2smsApiKey) {
    throw new Error("FAST2SMS_API_KEY is missing");
  }

  const payload = {
    route: "otp",
    variables_values: otp,
    numbers: phone
  };

  const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
    method: "POST",
    headers: {
      authorization: env.fast2smsApiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Fast2SMS request failed");
  }
}

async function sendViaFactor2(phone, otp) {
  if (!env.factor2ApiKey) {
    throw new Error("FACTOR2_API_KEY is missing");
  }

  const url = `https://2factor.in/API/V1/${env.factor2ApiKey}/SMS/${phone}/${otp}/${env.factor2TemplateName}`;
  const response = await fetch(url, { method: "GET" });
  if (!response.ok) {
    throw new Error("2Factor request failed");
  }
}

async function sendOtp(phone, otp) {
  if (env.otpMode === "fast2sms") {
    await sendViaFast2sms(phone, otp);
    return;
  }

  if (env.otpMode === "factor2") {
    await sendViaFactor2(phone, otp);
    return;
  }

  console.log(`[LOCAL OTP] ${phone} => ${otp}`);
}

module.exports = { generateOtp, sendOtp };
