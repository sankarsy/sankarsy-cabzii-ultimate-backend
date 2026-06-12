const Joi = require("joi");
const { env } = require("../config/env");
const { OtpSession } = require("../models/OtpSession");
const { User } = require("../models/User");
const { generateOtp, sendOtp } = require("../services/otpService");
const { signAccessToken } = require("../services/tokenService");
const { HttpError } = require("../utils/httpError");
const { normalizeMobileNumber } = require("../utils/mobile");
const { vendorNameForUser } = require("../utils/vendorAccess");
const { logAudit } = require("../services/auditService");

const sendOtpSchema = Joi.object({
  phone: Joi.string().optional(),
  mobile: Joi.string().optional(),
  mobileNumber: Joi.string().optional(),
  loginAs: Joi.string().valid("customer", "partner").optional()
}).or("phone", "mobile", "mobileNumber");

const verifyOtpSchema = Joi.object({
  phone: Joi.string().optional(),
  mobile: Joi.string().optional(),
  mobileNumber: Joi.string().optional(),
  otp: Joi.string().length(6).pattern(/^\d{6}$/).required(),
  loginAs: Joi.string().valid("customer", "partner").optional()
}).or("phone", "mobile", "mobileNumber");

const adminLoginSchema = Joi.object({
  phone: Joi.string().optional(),
  mobileNumber: Joi.string().optional(),
  password: Joi.string().min(1).required()
}).or("phone", "mobileNumber");

function resolveMobile(body) {
  const raw = body.mobileNumber ?? body.mobile ?? body.phone;
  const mobileNumber = normalizeMobileNumber(raw);
  if (!mobileNumber) throw new HttpError(400, "Enter a valid 10-digit mobile number.");
  return mobileNumber;
}

/** Per-number resend cooldown (same as legacy clientController LAST_SENT). */
const lastOtpSentAt = new Map();

function resolveRole(mobileNumber) {
  const isSuperAdmin =
    (env.adminPhone && mobileNumber === env.adminPhone) || env.superAdminPhones.includes(mobileNumber);
  const isVendorAdmin = Boolean(env.vendorAdminMap[mobileNumber]);
  if (isSuperAdmin) return "super_admin";
  if (isVendorAdmin) return "vendor_admin";
  return "customer";
}

async function findUserByMobile(mobileNumber) {
  let user = await User.findOne({ mobileNumber });
  if (user) return user;
  user = await User.findOne({ phone: mobileNumber });
  if (user) {
    if (!user.mobileNumber) {
      user.mobileNumber = mobileNumber;
      await user.save();
    }
    return user;
  }
  return null;
}

function sanitizeUser(user, sessionRole) {
  const role = sessionRole || user.role;
  const plain = typeof user.toObject === "function" ? user.toObject() : user;
  const vendorName = vendorNameForUser({
    ...plain,
    role,
    mobileNumber: plain.mobileNumber || plain.phone
  });
  return {
    _id: user._id,
    mobileNumber: user.mobileNumber || user.phone,
    role,
    createdAt: user.createdAt,
    ...(vendorName ? { vendorName } : {})
  };
}

function canAccessPartner(mobileNumber) {
  const privileged = resolveRole(mobileNumber);
  return privileged === "vendor_admin" || privileged === "super_admin";
}

async function sendOtpController(req, res) {
  const { error } = sendOtpSchema.validate(req.body);
  if (error) throw new HttpError(400, error.message);

  if (req.body.loginAs === "partner") {
    throw new HttpError(400, "OTP login is for customers only. Partners should use password login.");
  }

  const mobileNumber = resolveMobile(req.body);

  console.log("Using OTP mode:", env.otpMode);
  console.log("Has Fast2SMS key:", !!env.fast2smsApiKey);

  const cooldownMs = env.otpResendCooldownSeconds * 1000;
  const lastSent = lastOtpSentAt.get(mobileNumber) || 0;
  const elapsed = Date.now() - lastSent;
  if (elapsed < cooldownMs) {
    const wait = Math.ceil((cooldownMs - elapsed) / 1000);
    throw new HttpError(429, `Please wait ${wait}s before requesting another OTP.`);
  }

  const recentCount = await OtpSession.countDocuments({
    phone: mobileNumber,
    createdAt: { $gte: new Date(Date.now() - 15 * 60 * 1000) }
  });
  if (recentCount >= 5) {
    throw new HttpError(429, "Too many OTP requests for this number. Wait and try again.");
  }

  const otp = generateOtp();
  console.log("OTP:", otp);
  const expiresAt = new Date(Date.now() + env.otpTtlMinutes * 60 * 1000);

  const session = await OtpSession.create({ phone: mobileNumber, otp, expiresAt });

  let smsDelivered = env.otpMode === "local";
  let smsErrorMessage = "";

  try {
    await sendOtp(mobileNumber, otp);
    smsDelivered = true;
  } catch (err) {
    smsErrorMessage = err.userMessage || err.message || "SMS delivery failed";
    console.error("[OTP] send failed", { mobileNumber, message: smsErrorMessage });
  }

  const allowDevFallback = env.otpLocalFallback || env.otpMode === "local";

  if (!smsDelivered && !allowDevFallback) {
    await OtpSession.deleteOne({ _id: session._id });
    throw new HttpError(502, smsErrorMessage);
  }

  lastOtpSentAt.set(mobileNumber, Date.now());

  const response = {
    success: true,
    message: smsDelivered
      ? "OTP sent via Fast2SMS."
      : "OTP generated. Complete Fast2SMS verification for SMS, or use the code shown below (development).",
    resendAfterSeconds: env.otpResendCooldownSeconds,
    smsDelivered
  };

  if (!smsDelivered && allowDevFallback) {
    response.debugOtp = otp;
  } else if (env.otpMode === "local") {
    response.debugOtp = otp;
  }

  res.json(response);
}

async function verifyOtpController(req, res) {
  const { error, value } = verifyOtpSchema.validate(req.body);
  if (error) throw new HttpError(400, error.message);

  const mobileNumber = resolveMobile(value);

  const latestOtp = await OtpSession.findOne({
    phone: mobileNumber,
    consumedAt: null
  }).sort({ createdAt: -1 });

  if (!latestOtp) throw new HttpError(400, "OTP session not found. Request a new OTP.");
  if (latestOtp.expiresAt.getTime() < Date.now()) throw new HttpError(400, "OTP expired. Request a new OTP.");
  if (latestOtp.otp !== value.otp) throw new HttpError(400, "Invalid OTP.");

  latestOtp.consumedAt = new Date();
  await latestOtp.save();

  if (value.loginAs === "partner") {
    throw new HttpError(400, "OTP login is for customers only. Partners should use password login.");
  }

  let user = await findUserByMobile(mobileNumber);

  if (!user) {
    user = await User.create({ mobileNumber, role: "customer" });
  }

  user.lastLoginAt = new Date();
  user.loginCount = Number(user.loginCount || 0) + 1;
  await user.save();

  const sessionRole = "customer";
  const accessToken = signAccessToken(user, sessionRole);
  return res.json({
    success: true,
    message: "Client logged in successfully.",
    data: {
      token: accessToken,
      user: sanitizeUser(user, sessionRole)
    }
  });
}

function verifyPartnerPassword(mobileNumber, password) {
  const privilegedRole = resolveRole(mobileNumber);
  if (!canAccessPartner(mobileNumber)) return false;
  if (privilegedRole === "super_admin") {
    return Boolean(env.adminLoginPassword && password === env.adminLoginPassword);
  }
  const partnerPass = env.partnerLoginPassword || env.adminLoginPassword;
  return Boolean(partnerPass && password === partnerPass);
}

async function partnerLoginController(req, res) {
  const { error, value } = adminLoginSchema.validate(req.body);
  if (error) throw new HttpError(400, error.message);

  const mobileNumber = resolveMobile(value);

  if (!canAccessPartner(mobileNumber)) {
    throw new HttpError(403, "This mobile is not registered as a travel partner.");
  }

  if (!verifyPartnerPassword(mobileNumber, value.password)) {
    throw new HttpError(401, "Invalid partner mobile or password.");
  }

  const sessionRole = resolveRole(mobileNumber);

  let user = await findUserByMobile(mobileNumber);
  if (!user) {
    user = await User.create({ mobileNumber, role: sessionRole });
  } else if (user.role === "customer" && sessionRole !== "customer") {
    user.role = sessionRole;
  }

  user.lastLoginAt = new Date();
  user.loginCount = Number(user.loginCount || 0) + 1;
  await user.save();

  /* Login history entry (queryable in admin audit log) */
  await logAudit({
    req: { user },
    action: "login",
    entity: "session",
    entityId: user._id,
    meta: { role: sessionRole, ip: req.ip || "", userAgent: req.headers["user-agent"] || "" }
  });

  const accessToken = signAccessToken(user, sessionRole);

  res.json({
    success: true,
    message: "Partner login successful.",
    data: {
      token: accessToken,
      user: sanitizeUser(user, sessionRole)
    }
  });
}

async function adminLoginController(req, res) {
  const { error, value } = adminLoginSchema.validate(req.body);
  if (error) throw new HttpError(400, error.message);

  if (!env.adminLoginPhone || !env.adminLoginPassword) {
    throw new HttpError(500, "Admin login is not configured.");
  }

  const mobileNumber = resolveMobile(value);
  const adminMobile = normalizeMobileNumber(env.adminLoginPhone);

  if (mobileNumber !== adminMobile || value.password !== env.adminLoginPassword) {
    throw new HttpError(401, "Invalid admin credentials.");
  }

  let user = await findUserByMobile(mobileNumber);
  if (!user) {
    user = await User.create({ mobileNumber, role: "super_admin" });
  } else {
    user.role = "super_admin";
  }

  user.lastLoginAt = new Date();
  user.loginCount = Number(user.loginCount || 0) + 1;
  await user.save();

  const sessionRole = "super_admin";

  /* Login history entry (queryable in admin audit log) */
  await logAudit({
    req: { user },
    action: "login",
    entity: "session",
    entityId: user._id,
    meta: { role: sessionRole, ip: req.ip || "", userAgent: req.headers["user-agent"] || "" }
  });

  const accessToken = signAccessToken(user, sessionRole);

  res.json({
    success: true,
    message: "Admin login successful.",
    data: {
      token: accessToken,
      user: sanitizeUser(user, sessionRole)
    }
  });
}

async function meController(req, res) {
  res.json({ success: true, data: sanitizeUser(req.user, req.user.role) });
}

module.exports = {
  sendOtpController,
  verifyOtpController,
  partnerLoginController,
  adminLoginController,
  meController
};
