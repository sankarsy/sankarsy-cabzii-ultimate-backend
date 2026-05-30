const Joi = require("joi");
const mongoose = require("mongoose");
const { Location } = require("../models/Location");
const { City } = require("../models/City");
const { HttpError } = require("../utils/httpError");
const { logAudit } = require("../services/auditService");

const locationSchema = Joi.object({
  city: Joi.string().required(),
  name: Joi.string().required(),
  address: Joi.string().allow("").default(""),
  pincode: Joi.string().allow("").default(""),
  lat: Joi.number().allow(null).optional(),
  lng: Joi.number().allow(null).optional(),
  isActive: Joi.boolean().default(true)
});

async function listLocations(req, res) {
  const activeOnly = req.query.active !== "0" && req.query.active !== "false";
  const filter = activeOnly ? { isActive: true } : {};
  if (req.query.cityId && mongoose.isValidObjectId(req.query.cityId)) {
    filter.city = req.query.cityId;
  }
  if (req.query.city) {
    filter.cityName = new RegExp(String(req.query.city).trim(), "i");
  }
  if (req.query.pincode) {
    const pin = String(req.query.pincode).trim();
    if (pin) filter.pincode = new RegExp(`^${pin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
  }
  if (req.query.q) {
    const q = new RegExp(String(req.query.q).trim(), "i");
    filter.$or = [{ name: q }, { address: q }, { cityName: q }, { pincode: q }];
  }
  const data = await Location.find(filter).sort({ cityName: 1, name: 1 }).limit(500).lean();
  res.json({ success: true, data });
}

async function getLocationById(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, "Invalid id");
  const data = await Location.findById(req.params.id).lean();
  if (!data) throw new HttpError(404, "Location not found");
  res.json({ success: true, data });
}

async function createLocation(req, res) {
  const { error, value } = locationSchema.validate(req.body, { stripUnknown: true });
  if (error) throw new HttpError(400, error.message);
  if (!mongoose.isValidObjectId(value.city)) throw new HttpError(400, "Invalid city id");

  const cityDoc = await City.findById(value.city).lean();
  if (!cityDoc) throw new HttpError(400, "City not found");

  const data = await Location.create({
    ...value,
    cityName: cityDoc.state ? `${cityDoc.name}, ${cityDoc.state}` : cityDoc.name
  });

  await logAudit({ req, action: "create", entity: "location", entityId: data._id, after: data.toObject() });
  res.status(201).json({ success: true, data });
}

async function updateLocation(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, "Invalid id");
  const { error, value } = locationSchema.validate(req.body, { stripUnknown: true });
  if (error) throw new HttpError(400, error.message);
  if (!mongoose.isValidObjectId(value.city)) throw new HttpError(400, "Invalid city id");

  const cityDoc = await City.findById(value.city).lean();
  if (!cityDoc) throw new HttpError(400, "City not found");

  const data = await Location.findByIdAndUpdate(
    req.params.id,
    {
      ...value,
      cityName: cityDoc.state ? `${cityDoc.name}, ${cityDoc.state}` : cityDoc.name
    },
    { new: true, runValidators: true }
  );
  if (!data) throw new HttpError(404, "Location not found");

  await logAudit({ req, action: "update", entity: "location", entityId: data._id, after: data.toObject() });
  res.json({ success: true, data });
}

async function deleteLocation(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, "Invalid id");
  const data = await Location.findByIdAndDelete(req.params.id);
  if (!data) throw new HttpError(404, "Location not found");
  await logAudit({ req, action: "delete", entity: "location", entityId: data._id, before: data.toObject() });
  res.json({ success: true, message: "Location deleted" });
}

module.exports = { listLocations, getLocationById, createLocation, updateLocation, deleteLocation };
