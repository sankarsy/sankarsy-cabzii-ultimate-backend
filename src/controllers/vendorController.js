const Joi = require("joi");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const { Vendor } = require("../models/Vendor");
const { User } = require("../models/User");
const { Driver } = require("../models/Driver");
const { HttpError } = require("../utils/httpError");
const { logAudit } = require("../services/auditService");
const { privilegedRoleForPhone, isSuperAdminUser } = require("../utils/adminAccess");
const { normalizeMobileNumber } = require("../utils/mobile");
const { digitsPhone, contactPhoneDigits, vendorOwningAdminPhone } = require("../utils/vendorPhone");
const { escapeRegex, activeDocumentsFilter } = require("../utils/slugify");
const {
  assertDriverPhoneNotVendorOrAdmin,
  assertUniqueDriverPhone
} = require("../utils/driverIdentity");

const vendorSchema = Joi.object({
  name: Joi.string().required(),
  contactPhone: Joi.string().allow("").default(""),
  contactEmail: Joi.string().allow("").default(""),
  adminPhone: Joi.string().allow("").default(""),
  adminPassword: Joi.string().min(6).max(64).allow("").default(""),
  city: Joi.string().allow("").default(""),
  location: Joi.string().allow("").default(""),
  driverPhone: Joi.string().allow("").default(""),
  isActive: Joi.boolean().default(true)
});

async function assertAdminPhoneFree(adminPhone, excludeVendorId) {
  const mobile = digitsPhone(adminPhone);
  if (!mobile) return;

  if (privilegedRoleForPhone(mobile) === "super_admin") {
    throw new HttpError(400, "This mobile belongs to a super admin. Use a different phone for the vendor admin login.");
  }

  const vendors = await Vendor.find({}).select("_id name adminPhone").lean();
  const otherVendor = vendorOwningAdminPhone(vendors, mobile, excludeVendorId);
  if (otherVendor) {
    throw new HttpError(409, `This mobile is already used by vendor "${otherVendor.name}".`);
  }

  const user = await User.findOne({ mobileNumber: mobile }).select("role mobileNumber").lean();
  if (!user) return;

  if (user.role === "vendor_admin") {
    return;
  }
  if (user.role === "super_admin" || user.role === "driver") {
    throw new HttpError(409, "This mobile number is already registered. Use a different number.");
  }
}

async function upsertVendorAdminUser(adminPhone, adminPassword, previousPhone) {
  const mobile = digitsPhone(adminPhone);
  if (!mobile) return;

  if (privilegedRoleForPhone(mobile) === "super_admin") {
    throw new HttpError(400, "This mobile belongs to a super admin. Use a different phone for the vendor admin login.");
  }

  const prev = digitsPhone(previousPhone);
  if (prev === mobile && !adminPassword) return;

  const hashed = adminPassword ? await bcrypt.hash(adminPassword, 10) : "";
  const update = { mobileNumber: mobile, role: "vendor_admin" };
  if (hashed) update.passwordHash = hashed;

  if (prev && prev !== mobile) {
    const existing = await User.findOne({ mobileNumber: prev });
    if (existing) {
      const clash = await User.findOne({ mobileNumber: mobile, _id: { $ne: existing._id } });
      if (clash) throw new HttpError(409, "This mobile number is already registered.");
      await User.updateOne({ _id: existing._id }, { $set: update });
      return;
    }
  }

  const found = await User.findOne({ mobileNumber: mobile });
  if (found) {
    await User.updateOne({ _id: found._id }, { $set: update });
    return;
  }

  if (!adminPassword) {
    throw new HttpError(400, "Set a login password for the vendor admin phone.");
  }
  await User.create({
    mobileNumber: mobile,
    role: "vendor_admin",
    passwordHash: hashed
  });
}

async function upsertVendorDriverLogin({ driverPhone, vendorName, city, location, vendorAdminPhone, previousDriverPhone }) {
  const phone = digitsPhone(driverPhone);
  if (!phone) return;

  const vendorMobile = digitsPhone(vendorAdminPhone) || String(vendorAdminPhone || "");
  assertDriverPhoneNotVendorOrAdmin(phone, vendorMobile);

  const prev = digitsPhone(previousDriverPhone);
  let driver = null;
  if (prev && prev !== phone) {
    driver = await Driver.findOne({ phone: prev });
  }
  if (!driver) {
    driver = await Driver.findOne({ phone });
  }

  if (driver) {
    await assertUniqueDriverPhone(phone, driver._id);
    driver.phone = phone;
    driver.vendor = vendorName;
    driver.city = city || driver.city || "Chennai";
    driver.location = location || driver.location || "";
    driver.status = "active";
    driver.isDeleted = false;
    if (!driver.name) driver.name = `${vendorName} Driver`;
    await driver.save();
  } else {
    await assertUniqueDriverPhone(phone);
    await Driver.create({
      name: `${vendorName} Driver`,
      phone,
      vendor: vendorName,
      city: city || "Chennai",
      location: location || "",
      type: "local",
      status: "active",
      availabilityStatus: "available",
      isDeleted: false
    });
  }

  const user = await User.findOne({ mobileNumber: phone });
  if (user && user.role !== "driver" && user.role !== "customer") {
    throw new HttpError(400, "Driver phone is already used for partner or admin login.");
  }
  if (user) {
    await User.updateOne({ _id: user._id }, { $set: { mobileNumber: phone, role: "driver", name: `${vendorName} Driver` } });
    return;
  }
  await User.create({ mobileNumber: phone, role: "driver", name: `${vendorName} Driver` });
}

async function listVendors(req, res) {
  const activeOnly = req.query.active !== "0" && req.query.active !== "false";
  const filter = activeDocumentsFilter(activeOnly);
  const data = await Vendor.find(filter).sort({ name: 1 }).lean();
  data.forEach((v) => {
    v.isActive = v.isActive !== false;
  });
  if (!isSuperAdminUser(req)) {
    return res.json({
      success: true,
      data: data.map((v) => ({
        _id: v._id,
        name: v.name,
        slug: v.slug || "",
        city: v.city || "",
        location: v.location || "",
        isActive: v.isActive !== false
      }))
    });
  }
  res.json({ success: true, data });
}

async function getVendorById(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, "Invalid id");
  const data = await Vendor.findById(req.params.id).lean();
  if (!data) throw new HttpError(404, "Vendor not found");
  if (!isSuperAdminUser(req)) {
    const mine = normalizeMobileNumber(req.user?.mobileNumber);
    const owner = normalizeMobileNumber(data.adminPhone);
    if (!mine || mine !== owner) throw new HttpError(403, "You can only view your own vendor profile.");
  }
  res.json({ success: true, data });
}

async function createVendor(req, res) {
  const { error, value } = vendorSchema.validate(req.body, { stripUnknown: true });
  if (error) throw new HttpError(400, error.message);

  const name = String(value.name || "").trim();
  const existing = await Vendor.findOne({
    name: new RegExp(`^${escapeRegex(name)}$`, "i")
  });
  if (existing) throw new HttpError(409, `Vendor "${existing.name}" already exists. Open it from the list and click Edit.`);
  value.name = name;

  if (value.adminPhone && !digitsPhone(value.adminPhone)) {
    throw new HttpError(400, "Enter a valid 10-digit admin mobile number.");
  }
  if (value.driverPhone && !digitsPhone(value.driverPhone)) {
    throw new HttpError(400, "Enter a valid 10-digit driver mobile number.");
  }

  if (value.adminPhone) await assertAdminPhoneFree(value.adminPhone);

  const { adminPassword, ...vendorFields } = value;
  if (vendorFields.adminPhone) vendorFields.adminPhone = digitsPhone(vendorFields.adminPhone) || vendorFields.adminPhone;
  if (vendorFields.driverPhone) vendorFields.driverPhone = digitsPhone(vendorFields.driverPhone) || vendorFields.driverPhone;
  vendorFields.contactPhone = contactPhoneDigits(vendorFields.contactPhone);

  const data = await Vendor.create(vendorFields);

  try {
    if (value.adminPhone) {
      await upsertVendorAdminUser(value.adminPhone, adminPassword, "");
    }
    if (value.driverPhone) {
      await upsertVendorDriverLogin({
        driverPhone: value.driverPhone,
        vendorName: data.name,
        city: data.city,
        location: data.location,
        vendorAdminPhone: data.adminPhone
      });
    }
  } catch (err) {
    await Vendor.findByIdAndDelete(data._id);
    throw err;
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

  const current = await Vendor.findById(req.params.id);
  if (!current) throw new HttpError(404, "Vendor not found");

  if (value.name && value.name.trim() !== current.name) {
    const nameTaken = await Vendor.findOne({
      name: new RegExp(`^${escapeRegex(value.name.trim())}$`, "i"),
      _id: { $ne: current._id }
    });
    if (nameTaken) throw new HttpError(409, `Vendor name already exists ("${nameTaken.name}").`);
  }

  if (value.adminPhone && !digitsPhone(value.adminPhone)) {
    throw new HttpError(400, "Enter a valid 10-digit admin mobile number.");
  }
  if (value.driverPhone && !digitsPhone(value.driverPhone)) {
    throw new HttpError(400, "Enter a valid 10-digit driver mobile number.");
  }

  if (value.adminPhone) await assertAdminPhoneFree(value.adminPhone, current._id);

  const { adminPassword, ...vendorFields } = value;
  if (vendorFields.adminPhone) vendorFields.adminPhone = digitsPhone(vendorFields.adminPhone) || vendorFields.adminPhone;
  if (vendorFields.driverPhone) vendorFields.driverPhone = digitsPhone(vendorFields.driverPhone) || vendorFields.driverPhone;
  vendorFields.contactPhone = contactPhoneDigits(vendorFields.contactPhone);

  const data = await Vendor.findByIdAndUpdate(req.params.id, vendorFields, { new: true, runValidators: true });

  if (value.adminPhone) {
    await upsertVendorAdminUser(value.adminPhone, adminPassword, current.adminPhone);
  }
  if (value.driverPhone) {
    await upsertVendorDriverLogin({
      driverPhone: value.driverPhone,
      vendorName: data.name,
      city: data.city,
      location: data.location,
      vendorAdminPhone: data.adminPhone,
      previousDriverPhone: current.driverPhone
    });
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
