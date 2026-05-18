const Joi = require("joi");
const mongoose = require("mongoose");
const { Vendor } = require("../models/Vendor");
const { User } = require("../models/User");
const { HttpError } = require("../utils/httpError");
const { logAudit } = require("../services/auditService");

const vendorSchema = Joi.object({
  name: Joi.string().required(),
  contactPhone: Joi.string().allow("").default(""),
  contactEmail: Joi.string().allow("").default(""),
  adminPhone: Joi.string().pattern(/^[0-9]{10,15}$/).allow("").default(""),
  isActive: Joi.boolean().default(true)
});

async function listVendors(req, res) {
  const activeOnly = req.query.active === "1" || req.query.active === "true";
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

  const data = await Vendor.create(value);

  if (value.adminPhone) {
    await User.findOneAndUpdate(
      { phone: value.adminPhone },
      {
        $set: {
          phone: value.adminPhone,
          role: "vendor_admin",
          vendorName: data.name
        }
      },
      { upsert: true, new: true }
    );
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

  const data = await Vendor.findByIdAndUpdate(req.params.id, value, { new: true, runValidators: true });
  if (!data) throw new HttpError(404, "Vendor not found");

  if (value.adminPhone) {
    await User.findOneAndUpdate(
      { phone: value.adminPhone },
      {
        $set: {
          phone: value.adminPhone,
          role: "vendor_admin",
          vendorName: data.name
        }
      },
      { upsert: true, new: true }
    );
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
