const Joi = require("joi");
const mongoose = require("mongoose");
const { CrmLead } = require("../models/CrmLead");
const { ChatLead } = require("../models/ChatLead");
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
  vehicleType: Joi.string().allow("").default(""),
  estimatedFare: Joi.number().min(0).default(0),
  assignedTo: Joi.string().allow("").default(""),
  followUpAt: Joi.date().allow(null).default(null),
  whatsappSent: Joi.boolean().default(false),
  repeatCustomer: Joi.boolean().default(false)
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

async function crmDashboard(req, res) {
  requireSuperAdmin(req);
  const [byStage, dueFollowUps, total, completed] = await Promise.all([
    CrmLead.aggregate([{ $group: { _id: "$stage", count: { $sum: 1 } } }]),
    CrmLead.countDocuments({ followUpAt: { $lte: new Date() }, stage: { $nin: ["completed", "lost"] } }),
    CrmLead.countDocuments(),
    CrmLead.countDocuments({ stage: "completed" })
  ]);
  const stageMap = Object.fromEntries(byStage.map((s) => [s._id, s.count]));
  res.json({
    success: true,
    data: {
      total,
      completed,
      dueFollowUps,
      conversionRate: total ? Math.round((completed / total) * 100) : 0,
      byStage: stageMap
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
  crmDashboard
};
