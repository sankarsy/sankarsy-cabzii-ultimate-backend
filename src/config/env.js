const dotenv = require("dotenv");

dotenv.config();

function cleanEnvString(value) {
  return String(value || "")
    .trim()
    .replace(/^['"]|['"]$/g, "");
}

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 8000),
  mongodbUri: cleanEnvString(process.env.MONGODB_URI),
  frontendUrl: process.env.FRONTEND_URL || "https://cabzii.in,https://www.cabzii.in,http://localhost:3000,http://localhost:3001,http://localhost:3002",
  jwtSecret: process.env.JWT_SECRET || "",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  otpMode: (process.env.OTP_MODE || "local").toLowerCase(),
  otpLength: Number(process.env.OTP_LENGTH || 6),
  otpTtlMinutes: Number(process.env.OTP_TTL_MINUTES || 5),
  /** When true (default in development), OTP is still saved if SMS fails — use OTP_MODE=local or debug OTP in UI. */
  otpLocalFallback:
    process.env.OTP_LOCAL_FALLBACK === "true" ||
    (process.env.OTP_LOCAL_FALLBACK !== "false" && (process.env.NODE_ENV || "development") !== "production"),
  fast2smsApiKey: cleanEnvString(process.env.FAST2SMS_API_KEY),
  fast2smsSenderId: cleanEnvString(process.env.FAST2SMS_SENDER_ID) || "CABZII",
  fast2smsEntityId: cleanEnvString(process.env.FAST2SMS_ENTITY_ID),
  fast2smsTemplateId: cleanEnvString(process.env.FAST2SMS_TEMPLATE_ID),
  fast2smsOtpMessage: process.env.FAST2SMS_OTP_MESSAGE || "{otp} is your Cabzii login OTP. Do not share it.",
  factor2ApiKey: process.env.FACTOR2_API_KEY || "",
  factor2TemplateName: process.env.FACTOR2_TEMPLATE_NAME || "cabzii",
  brandName: process.env.BRAND_NAME || "Cabzii.in",
  adminPhone: process.env.ADMIN_PHONE || "",
  adminLoginPhone: process.env.ADMIN_LOGIN_PHONE || "",
  adminLoginPassword: process.env.ADMIN_LOGIN_PASSWORD || "",
  partnerLoginPassword: cleanEnvString(process.env.PARTNER_LOGIN_PASSWORD) || process.env.ADMIN_LOGIN_PASSWORD || "",
  superAdminPhones: (process.env.SUPER_ADMIN_PHONES || "").split(",").map((v) => v.trim()).filter(Boolean),
  vendorAdminMap: (process.env.VENDOR_ADMIN_MAP || "")
    .split(",")
    .map((pair) => pair.trim())
    .filter(Boolean)
    .reduce((acc, pair) => {
      const [phone, vendorName] = pair.split(":").map((v) => v.trim());
      if (phone && vendorName) acc[phone] = vendorName;
      return acc;
    }, {})
};

function validateEnv() {
  const missing = [];
  if (!env.mongodbUri) missing.push("MONGODB_URI");
  if (!env.jwtSecret) missing.push("JWT_SECRET");

  if (missing.length) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }

  if (!/^mongodb(\+srv)?:\/\//i.test(env.mongodbUri)) {
    throw new Error(
      'MONGODB_URI must start with "mongodb://" or "mongodb+srv://" (check for extra quotes in .env)'
    );
  }
}

module.exports = { env, validateEnv };
