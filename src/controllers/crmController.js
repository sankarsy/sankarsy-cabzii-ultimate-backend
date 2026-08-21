const Joi = require("joi");
const mongoose = require("mongoose");
const { CrmLead } = require("../models/CrmLead");
const { ChatLead } = require("../models/ChatLead");
const { Booking } = require("../models/Booking");
const { HttpError } = require("../utils/httpError");
const { parseListQuery, paginatedFind } = require("../utils/listQuery");
const { logAudit } = require("../services/auditService");
const { isSuperAdminUser } = require("../utils/adminAccess");

const STAGES = ["new", "contacted", "quotation_sent", "follow_up", "confirmed", "completed", "lost"];

const leadSchema = Joi.object({
  name: Joi.string().min(2).max(80).required(),
  mobile: Joi.string().pattern(/^[6-9]\d{9}$/).required(),
  email: Joi.string().allow("").default(""),
  source: Joi.string().allow("").default("website"),
  stage: Joi.string().valid(...STAGES).default("new"),
  route: Joi.string().allow("").default(""),
  productType: Joi.string().valid("cab", "bus", "driver", "tour", "other").default("cab"),
  vehicleType: Joi.string().allow("").default(""),
  operator: Joi.string().allow("").default(""),
  seats: Joi.string().allow("").default(""),
  boardingPoint: Joi.string().allow("").default(""),
  droppingPoint: Joi.string().allow("").default(""),
  estimatedFare: Joi.number().min(0).default(0),
  assignedTo: Joi.string().allow("").default(""),
  followUpAt: Joi.date().allow(null).default(null),
  whatsappSent: Joi.boolean().default(false),
  repeatCustomer: Joi.boolean().default(false),
  bookingId: Joi.string().allow("", null)
});

const noteSchema = Joi.object({
  text: Joi.string().min(1).required(),
  author: Joi.string().allow("").default("admin")
});

function requireSuperAdmin(req) {
  if (!isSuperAdminUser(req)) throw new HttpError(403, "Super admin only.");
}

async function listCrmLeads(req, res) {
  requireSuperAdmin(req);
  const pq = parseListQuery(req);
  const filter = {};
  if (req.query.stage) filter.stage = req.query.stage;
  if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;
  if (req.query.productType) filter.productType = req.query.productType;
  const { data, meta } = await paginatedFind(CrmLead, filter, pq, { updatedAt: -1 });
  res.json({ success: true, data, meta });
}

async function getCrmLead(req, res) {
  requireSuperAdmin(req);
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, "Invalid id");
  const data = await CrmLead.findById(req.params.id).lean();
  if (!data) throw new HttpError(404, "Lead not found");
  res.json({ success: true, data });
}

async function createCrmLead(req, res) {
  requireSuperAdmin(req);
  const { error, value } = leadSchema.validate(req.body, { stripUnknown: true, convert: true });
  if (error) throw new HttpError(400, error.message);
  if (!value.bookingId || !mongoose.isValidObjectId(value.bookingId)) delete value.bookingId;
  const prior = await CrmLead.countDocuments({ mobile: value.mobile, stage: "completed" });
  const data = await CrmLead.create({ ...value, repeatCustomer: prior > 0 });
  await logAudit({ req, action: "create", entity: "crm_lead", entityId: data._id, after: data.toObject() });
  res.status(201).json({ success: true, data });
}

async function updateCrmLead(req, res) {
  requireSuperAdmin(req);
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, "Invalid id");
  const { error, value } = leadSchema.validate(req.body, { stripUnknown: true, convert: true });
  if (error) throw new HttpError(400, error.message);
  if (!value.bookingId || !mongoose.isValidObjectId(value.bookingId)) delete value.bookingId;
  const data = await CrmLead.findByIdAndUpdate(req.params.id, value, { new: true, runValidators: true });
  if (!data) throw new HttpError(404, "Lead not found");
  await logAudit({ req, action: "update", entity: "crm_lead", entityId: data._id, after: data.toObject() });
  res.json({ success: true, data });
}

async function addCrmNote(req, res) {
  requireSuperAdmin(req);
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, "Invalid id");
  const { error, value } = noteSchema.validate(req.body);
  if (error) throw new HttpError(400, error.message);
  const data = await CrmLead.findByIdAndUpdate(
    req.params.id,
    { $push: { notes: value } },
    { new: true }
  );
  if (!data) throw new HttpError(404, "Lead not found");
  res.json({ success: true, data });
}

async function addCallLog(req, res) {
  requireSuperAdmin(req);
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, "Invalid id");
  const log = {
    outcome: String(req.body.outcome || "").trim(),
    durationMinutes: Number(req.body.durationMinutes) || 0,
    notes: String(req.body.notes || "").trim()
  };
  const data = await CrmLead.findByIdAndUpdate(req.params.id, { $push: { callLogs: log } }, { new: true });
  if (!data) throw new HttpError(404, "Lead not found");
  res.json({ success: true, data });
}

async function importChatLeads(req, res) {
  requireSuperAdmin(req);
  const chatLeads = await ChatLead.find({}).sort({ createdAt: -1 }).limit(100).lean();
  let imported = 0;
  for (const cl of chatLeads) {
    const exists = await CrmLead.findOne({ chatLeadId: cl._id });
    if (exists) continue;
    const prior = await CrmLead.countDocuments({ mobile: cl.mobile, stage: "completed" });
    await CrmLead.create({
      name: cl.name,
      mobile: cl.mobile,
      source: cl.source || "zii-chatbot",
      stage: "new",
      chatLeadId: cl._id,
      repeatCustomer: prior > 0
    });
    imported += 1;
  }
  res.json({ success: true, data: { imported } });
}

function crmMobileFromPhone(phone) {
  const ten = String(phone || "").replace(/\D/g, "").slice(-10);
  return /^[6-9]\d{9}$/.test(ten) ? ten : "";
}

function payloadFromBooking(b) {
  const type = b.type === "bus" ? "bus" : b.type === "driver" ? "driver" : b.type === "tour" ? "tour" : "cab";
  const from = type === "bus" ? b.busMeta?.fromCity || b.pickup : b.pickup;
  const to = type === "bus" ? b.busMeta?.toCity || b.drop : b.drop;
  const route = [from, to].filter(Boolean).join(" → ");
  const name = String(b.customerName || `Guest ${String(b.phone || "").slice(-4)}`).slice(0, 80);
  return {
    name: name.length >= 2 ? name : `Guest ${String(b.phone || "").slice(-4)}`,
    mobile: crmMobileFromPhone(b.phone),
    email: b.email || "",
    source: type === "bus" ? "bus-booking" : "website-booking",
    productType: type,
    route,
    vehicleType: type === "bus" ? b.busMeta?.busType || b.tripType || "Bus" : b.tripType || b.serviceTripType || "",
    operator: b.busMeta?.operator || "",
    seats: Array.isArray(b.busMeta?.seats) ? b.busMeta.seats.join(", ") : "",
    boardingPoint: b.busMeta?.boardingPoint || "",
    droppingPoint: b.busMeta?.droppingPoint || "",
    estimatedFare: Number(b.amount) || 0,
    bookingId: b._id,
    stage: b.status === "finished" ? "completed" : b.status === "cancelled" ? "lost" : b.status === "confirmed" ? "confirmed" : "new"
  };
}

async function upsertCrmLeadFromBooking(bookingDoc) {
  const b = bookingDoc?.toObject ? bookingDoc.toObject() : bookingDoc;
  if (!b?._id) return null;
  const payload = payloadFromBooking(b);
  if (!payload.mobile) return null;
  const prior = await CrmLead.countDocuments({ mobile: payload.mobile, stage: "completed" });
  const existing = await CrmLead.findOne({ bookingId: b._id });
  if (existing) {
    Object.assign(existing, payload, { repeatCustomer: prior > 0 || existing.repeatCustomer });
    await existing.save();
    return existing;
  }
  return CrmLead.create({ ...payload, repeatCustomer: prior > 0 });
}

async function importBookings(req, res) {
  requireSuperAdmin(req);
  const bookings = await Booking.find({}).sort({ createdAt: -1 }).limit(300).lean();
  let imported = 0;
  for (const b of bookings) {
    const before = await CrmLead.findOne({ bookingId: b._id }).select("_id").lean();
    const lead = await upsertCrmLeadFromBooking(b);
    if (lead && !before) imported += 1;
  }
  res.json({ success: true, data: { imported } });
}

async function crmDashboard(req, res) {
  requireSuperAdmin(req);
  const [byStage, byProduct, dueFollowUps, total, completed, busLeads] = await Promise.all([
    CrmLead.aggregate([{ $group: { _id: "$stage", count: { $sum: 1 } } }]),
    CrmLead.aggregate([{ $group: { _id: "$productType", count: { $sum: 1 } } }]),
    CrmLead.countDocuments({ followUpAt: { $lte: new Date() }, stage: { $nin: ["completed", "lost"] } }),
    CrmLead.countDocuments(),
    CrmLead.countDocuments({ stage: "completed" }),
    CrmLead.countDocuments({ productType: "bus" })
  ]);
  const stageMap = Object.fromEntries(byStage.map((s) => [s._id, s.count]));
  const productMap = Object.fromEntries(byProduct.map((s) => [s._id || "cab", s.count]));
  res.json({
    success: true,
    data: {
      total,
      completed,
      dueFollowUps,
      busLeads,
      conversionRate: total ? Math.round((completed / total) * 100) : 0,
      byStage: stageMap,
      byProductType: productMap
    }
  });
}

module.exports = {
  listCrmLeads,
  getCrmLead,
  createCrmLead,
  updateCrmLead,
  addCrmNote,
  addCallLog,
  importChatLeads,
  importBookings,
  upsertCrmLeadFromBooking,
  crmDashboard
};
