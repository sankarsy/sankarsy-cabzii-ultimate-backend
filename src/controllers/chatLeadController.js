const Joi = require("joi");
const { ChatLead } = require("../models/ChatLead");
const { HttpError } = require("../utils/httpError");

const createSchema = Joi.object({
  name: Joi.string().min(2).max(80).required(),
  mobile: Joi.string().pattern(/^[6-9]\d{9}$/).required(),
  source: Joi.string().max(40).default("zii-chatbot")
});

async function createChatLead(req, res) {
  const { error, value } = createSchema.validate(req.body);
  if (error) throw new HttpError(400, error.details[0]?.message || "Invalid lead data.");

  const recent = await ChatLead.findOne({
    mobile: value.mobile,
    createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) }
  }).lean();

  if (recent) {
    return res.json({ success: true, data: { id: recent._id, duplicate: true } });
  }

  const lead = await ChatLead.create({
    name: value.name.trim(),
    mobile: value.mobile,
    source: value.source,
    userAgent: String(req.headers["user-agent"] || "").slice(0, 500),
    ip: String(req.ip || req.headers["x-forwarded-for"] || "").slice(0, 64)
  });

  res.status(201).json({ success: true, data: { id: lead._id } });
}

async function listChatLeads(req, res) {
  const leads = await ChatLead.find()
    .sort({ createdAt: -1 })
    .limit(300)
    .select("name mobile source createdAt")
    .lean();
  res.json({ success: true, data: leads });
}

module.exports = { createChatLead, listChatLeads };
