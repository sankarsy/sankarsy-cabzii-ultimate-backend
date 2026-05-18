const Joi = require("joi");
const { env } = require("../config/env");
const { OtpSession } = require("../models/OtpSession");
const { User } = require("../models/User");
const { generateOtp, sendOtp } = require("../services/otpService");
const { signAccessToken } = require("../services/tokenService");
const { HttpError } = require("../utils/httpError");

const sendOtpSchema = Joi.object({
  phone: Joi.string().pattern(/^[0-9]{10,15}$/).required()
});

const verifyOtpSchema = Joi.object({
  phone: Joi.string().pattern(/^[0-9]{10,15}$/).required(),
  otp: Joi.string().pattern(/^[0-9]{4,8}$/).required(),
  name: Joi.string().allow("").optional()
});

const adminLoginSchema = Joi.object({
  phone: Joi.string().pattern(/^[0-9]{10,15}$/).required(),
  password: Joi.string().min(1).required(),
  name: Joi.string().allow("").optional()
});

async function sendOtpController(req, res) {
  const { error, value } = sendOtpSchema.validate(req.body);
  if (error) throw new HttpError(400, error.message);

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + env.otpTtlMinutes * 60 * 1000);

  await OtpSession.create({ phone: value.phone, otp, expiresAt });
  await sendOtp(value.phone, otp);

  const response = {
    success: true,
    message: "OTP sent successfully."
  };

  if (env.otpMode === "local") {
    response.debugOtp = otp;
  }

  res.json(response);
}

async function verifyOtpController(req, res) {
  const { error, value } = verifyOtpSchema.validate(req.body);
  if (error) throw new HttpError(400, error.message);

  const latestOtp = await OtpSession.findOne({
    phone: value.phone,
    consumedAt: null
  }).sort({ createdAt: -1 });

  if (!latestOtp) throw new HttpError(400, "OTP session not found.");
  if (latestOtp.expiresAt.getTime() < Date.now()) throw new HttpError(400, "OTP expired.");
  if (latestOtp.otp !== value.otp) throw new HttpError(400, "Invalid OTP.");

  latestOtp.consumedAt = new Date();
  await latestOtp.save();

  const isSuperAdmin =
    (env.adminPhone && value.phone === env.adminPhone) || env.superAdminPhones.includes(value.phone);
  const vendorName = env.vendorAdminMap[value.phone] || "";
  const role = isSuperAdmin ? "super_admin" : vendorName ? "vendor_admin" : "customer";

  const user = await User.findOneAndUpdate(
    { phone: value.phone },
    {
      $set: {
        phone: value.phone,
        role,
        vendorName,
        ...(value.name ? { name: value.name } : {})
      }
    },
    { upsert: true, new: true }
  );

  const accessToken = signAccessToken(user);

  res.json({
    success: true,
    message: "OTP verified successfully.",
    data: {
      token: accessToken,
      user
    }
  });
}

async function adminLoginController(req, res) {
  const { error, value } = adminLoginSchema.validate(req.body);
  if (error) throw new HttpError(400, error.message);

  if (!env.adminLoginPhone || !env.adminLoginPassword) {
    throw new HttpError(500, "Admin login is not configured.");
  }

  const isValidAdmin = value.phone === env.adminLoginPhone && value.password === env.adminLoginPassword;
  if (!isValidAdmin) {
    throw new HttpError(401, "Invalid admin credentials.");
  }

  const user = await User.findOneAndUpdate(
    { phone: value.phone },
    {
      $set: {
        phone: value.phone,
        role: "super_admin",
        vendorName: "",
        ...(value.name ? { name: value.name } : {})
      }
    },
    { upsert: true, new: true }
  );

  const accessToken = signAccessToken(user);

  res.json({
    success: true,
    message: "Admin login successful.",
    data: {
      token: accessToken,
      user
    }
  });
}

async function meController(req, res) {
  res.json({ success: true, data: req.user });
}

module.exports = { sendOtpController, verifyOtpController, adminLoginController, meController };
