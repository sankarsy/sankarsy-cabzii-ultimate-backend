const { Testimonial } = require("../models/Testimonial");
const { HttpError } = require("../utils/httpError");
const { parseListQuery, paginatedFind } = require("../utils/listQuery");
const { logAudit } = require("../services/auditService");
const Joi = require("joi");
const mongoose = require("mongoose");

const testimonialSchema = Joi.object({
  name: Joi.string().required(),
  location: Joi.string().allow("").default(""),
  message: Joi.string().required(),
  rating: Joi.number().min(1).max(5).default(5),
  sortOrder: Joi.number().default(0),
  published: Joi.boolean().default(true)
});

async function listTestimonials(req, res) {
  const pq = parseListQuery(req);
  const isAdmin = req.user && ["super_admin", "vendor_admin"].includes(req.user.role);
  const includeAll = isAdmin && (req.query.includeUnpublished === "1" || req.query.admin === "1");
  const filter = includeAll ? {} : { published: true };
  const { data, meta } = await paginatedFind(Testimonial, filter, pq, { sortOrder: 1, createdAt: -1 });
  res.json({ success: true, data, meta });
}

async function getTestimonialById(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, "Invalid id");
  const doc = await Testimonial.findById(req.params.id);
  if (!doc) throw new HttpError(404, "Testimonial not found");
  res.json({ success: true, data: doc });
}

async function createTestimonial(req, res) {
  const { error, value } = testimonialSchema.validate(req.body, { stripUnknown: true, convert: true });
  if (error) throw new HttpError(400, error.message);
  const data = await Testimonial.create(value);
  await logAudit({ req, action: "create", entity: "testimonial", entityId: data._id, after: data.toObject() });
  res.status(201).json({ success: true, data });
}

async function updateTestimonial(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, "Invalid id");
  const { error, value } = testimonialSchema.validate(req.body, { stripUnknown: true, convert: true });
  if (error) throw new HttpError(400, error.message);
  const data = await Testimonial.findByIdAndUpdate(req.params.id, value, { new: true, runValidators: true });
  if (!data) throw new HttpError(404, "Testimonial not found");
  await logAudit({ req, action: "update", entity: "testimonial", entityId: data._id, after: data.toObject() });
  res.json({ success: true, data });
}

async function deleteTestimonial(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, "Invalid id");
  const data = await Testimonial.findByIdAndDelete(req.params.id);
  if (!data) throw new HttpError(404, "Testimonial not found");
  await logAudit({ req, action: "delete", entity: "testimonial", entityId: data._id, before: data.toObject() });
  res.json({ success: true, message: "Testimonial deleted" });
}

module.exports = {
  listTestimonials,
  getTestimonialById,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial
};
