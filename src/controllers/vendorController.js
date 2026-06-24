const Joi = require("joi");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const { Vendor } = require("../models/Vendor");
const { User } = require("../models/User");
const { HttpError } = require("../utils/httpError");
const { logAudit } = require("../services/auditService");
const { privilegedRoleForPhone } = require("../utils/adminAccess");
const { normalizeMobileNumber } = require("../utils/mobile");

const vendorSchema = Joi.object({
  name: Joi.string().required(),
  contactPhone: Joi.string().allow("").default(""),
  contactEmail: Joi.string().allow("").default(""),
  adminPhone: Joi.string().pattern(/^[0-9]{10,15}$/).allow("").default(""),
  adminPassword: Joi.string().min(6).max(64).allow("").default(""),
  isActive: Joi.boolean().default(true)
});

async function upsertVendorAdminUser(adminPhone, adminPassword, isEdit) {
  const mobile = normalizeMobileNumber(adminPhone);
  if (!mobile) return;

  if (privilegedRoleForPhone(mobile) === "super_admin") {
    throw new HttpError(400, "This mobile belongs to a super admin. Use a different phone for the vendor admin login.");
  }

  const update = {
    mobileNumber: mobile,
    role: "vendor_admin"
  };

  if (adminPassword) {
    update.passwordHash = await bcrypt.hash(adminPassword, 10);
  } else if (!isEdit) {
    throw new HttpError(400, "Set a login password for the vendor admin phone.");
  }

  await User.findOneAndUpdate({ mobileNumber: mobile }, { $set: update }, { upsert: true, new: true, setDefaultsOnInsert: true });
}

async function listVendors(req, res) {
  const activeOnly = req.query.active !== "0" && req.query.active !== "false";
  const filter = activeOnly ? { isActive: true } : {};
  const data = await Vendor.find(filter).sort({ name: 1 }).lean();
  res.json({ success: true, data });
}

async function getVendorById(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, "Invalid id");
  const data = await Vendor.findById(req.params.id).lean();
  if (!data) throw new HttpError(404, "Vendor not found");
  res.json({ success: true, data });
}

async function createVendor(req, res) {
  const { error, value } = vendorSchema.validate(req.body, { stripUnknown: true });
  if (error) throw new HttpError(400, error.message);

  const existing = await Vendor.findOne({ name: value.name.trim() });
  if (existing) throw new HttpError(409, "Vendor name already exists");

  if (value.adminPhone) {
    const mobile = normalizeMobileNumber(value.adminPhone);
    if (mobile && privilegedRoleForPhone(mobile) === "super_admin") {
      throw new HttpError(400, "This mobile belongs to a super admin. Use a different phone for the vendor admin login.");
    }
  }

  const { adminPassword, ...vendorFields } = value;
  const data = await Vendor.create(vendorFields);

  if (value.adminPhone) {
    await upsertVendorAdminUser(value.adminPhone, adminPassword, false);
  }

  await logAudit({
    req,
    action: "create",
    entity: "vendor",
    entityId: data._id,
    vendor: data.name,
    after: data.toObject()
  });

  res.status(201).json({ success: true, data });
}

async function updateVendor(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, "Invalid id");
  const { error, value } = vendorSchema.validate(req.body, { stripUnknown: true });
  if (error) throw new HttpError(400, error.message);

  const { adminPassword, ...vendorFields } = value;
  const data = await Vendor.findByIdAndUpdate(req.params.id, vendorFields, { new: true, runValidators: true });
  if (!data) throw new HttpError(404, "Vendor not found");

  if (value.adminPhone) {
    await upsertVendorAdminUser(value.adminPhone, adminPassword, true);
  }

  await logAudit({
    req,
    action: "update",
    entity: "vendor",
    entityId: data._id,
    vendor: data.name,
    after: data.toObject()
  });

  res.json({ success: true, data });
}

async function deleteVendor(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, "Invalid id");
  const data = await Vendor.findByIdAndDelete(req.params.id);
  if (!data) throw new HttpError(404, "Vendor not found");
  await logAudit({
    req,
    action: "delete",
    entity: "vendor",
    entityId: data._id,
    before: data.toObject()
  });
  res.json({ success: true, message: "Vendor deleted" });
}

module.exports = { listVendors, getVendorById, createVendor, updateVendor, deleteVendor };
