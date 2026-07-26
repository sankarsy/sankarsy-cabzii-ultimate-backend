const Joi = require("joi");
const { ChatLead } = require("../models/ChatLead");
const { HttpError } = require("../utils/httpError");

const MAX_STORED_MESSAGES = 80;

const createSchema = Joi.object({
  name: Joi.string().min(1).max(80).default("Guest"),
  mobile: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .required(),
  source: Joi.string().max(40).default("zii-chatbot")
});

const appendSchema = Joi.object({
  mobile: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .required(),
  name: Joi.string().min(1).max(80).optional(),
  messages: Joi.array()
    .items(
      Joi.object({
        role: Joi.string().valid("user", "assistant").required(),
        content: Joi.string().min(1).max(2000).required()
      })
    )
    .min(1)
    .max(10)
    .required()
});

function clientMeta(req) {
  return {
    userAgent: String(req.headers["user-agent"] || "").slice(0, 500),
    ip: String(req.ip || req.headers["x-forwarded-for"] || "").slice(0, 64)
  };
}

async function findOrCreateLead({ name, mobile, source }, req) {
  const meta = clientMeta(req);
  let lead = await ChatLead.findOne({ mobile }).sort({ createdAt: -1 });

  if (lead) {
    const updates = {};
    if (name && name !== "Guest" && lead.name === "Guest") updates.name = name.trim();
    else if (name && name.length >= 2 && name !== lead.name) updates.name = name.trim();
    if (source) updates.source = source;
    Object.assign(updates, meta);
    if (Object.keys(updates).length) {
      Object.assign(lead, updates);
      await lead.save();
    }
    return { lead, created: false };
  }

  lead = await ChatLead.create({
    name: (name || "Guest").trim(),
    mobile,
    source: source || "zii-chatbot",
    ...meta
  });
  return { lead, created: true };
}

async function createChatLead(req, res) {
  const { error, value } = createSchema.validate(req.body);
  if (error) throw new HttpError(400, error.details[0]?.message || "Invalid lead data.");

  const { lead, created } = await findOrCreateLead(value, req);
  res.status(created ? 201 : 200).json({
    success: true,
    data: { id: lead._id, duplicate: !created }
  });
}

async function appendChatMessages(req, res) {
  const { error, value } = appendSchema.validate(req.body);
  if (error) throw new HttpError(400, error.details[0]?.message || "Invalid message data.");

  const { lead } = await findOrCreateLead(
    { name: value.name || "Guest", mobile: value.mobile, source: "zii-chatbot" },
    req
  );

  const stamped = value.messages.map((m) => ({
    role: m.role,
    content: String(m.content).trim().slice(0, 2000),
    createdAt: new Date()
  }));

  lead.messages = [...(lead.messages || []), ...stamped].slice(-MAX_STORED_MESSAGES);
  lead.messageCount = lead.messages.length;

  const lastUser = [...stamped].reverse().find((m) => m.role === "user");
  if (lastUser) {
    lead.lastUserMessage = lastUser.content.slice(0, 500);
  }
  lead.lastMessageAt = new Date();
  if (value.name && value.name.length >= 2) lead.name = value.name.trim();

  await lead.save();

  res.json({
    success: true,
    data: {
      id: lead._id,
      messageCount: lead.messageCount,
      lastUserMessage: lead.lastUserMessage
    }
  });
}

async function listChatLeads(req, res) {
  const leads = await ChatLead.find()
    .sort({ lastMessageAt: -1, createdAt: -1 })
    .limit(300)
    .select("name mobile source createdAt updatedAt lastUserMessage lastMessageAt messageCount messages")
    .lean();
  res.json({ success: true, data: leads });
}

module.exports = { createChatLead, appendChatMessages, listChatLeads };
