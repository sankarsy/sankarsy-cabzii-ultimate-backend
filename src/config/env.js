const dotenv = require("dotenv");

dotenv.config();

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 8000),
  mongodbUri: process.env.MONGODB_URI || "",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  jwtSecret: process.env.JWT_SECRET || "",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  otpMode: process.env.OTP_MODE || "local",
  otpLength: Number(process.env.OTP_LENGTH || 6),
  otpTtlMinutes: Number(process.env.OTP_TTL_MINUTES || 5),
  fast2smsApiKey: process.env.FAST2SMS_API_KEY || "",
  fast2smsSenderId: process.env.FAST2SMS_SENDER_ID || "CABZII",
  fast2smsEntityId: process.env.FAST2SMS_ENTITY_ID || "",
  fast2smsTemplateId: process.env.FAST2SMS_TEMPLATE_ID || "",
  factor2ApiKey: process.env.FACTOR2_API_KEY || "",
  factor2TemplateName: process.env.FACTOR2_TEMPLATE_NAME || "cabzii",
  brandName: process.env.BRAND_NAME || "Cabzii.in",
  adminPhone: process.env.ADMIN_PHONE || "",
  adminLoginPhone: process.env.ADMIN_LOGIN_PHONE || "",
  adminLoginPassword: process.env.ADMIN_LOGIN_PASSWORD || "",
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
}

module.exports = { env, validateEnv };
