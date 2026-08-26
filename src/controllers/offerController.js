const Joi = require("joi");
const mongoose = require("mongoose");
const { Offer } = require("../models/Offer");
const { HttpError } = require("../utils/httpError");
const { logAudit } = require("../services/auditService");
const { offers, services, routes, imageRemap } = require("../data/defaultHomeCards");

const SECTIONS = ["offers", "services", "routes"];

const offerSchema = Joi.object({
  section: Joi.string()
    .valid(...SECTIONS)
    .default("offers"),
  tag: Joi.string().allow("").default(""),
  title: Joi.string().required(),
  desc: Joi.string().allow("").default(""),
  iconKey: Joi.string().valid("car", "holiday", "route", "airport", "driver").default("car"),
  color: Joi.string().allow("").default("from-[var(--cabzii-brand)] to-blue-500"),
  image: Joi.string().allow("").default(""),
  href: Joi.string().allow("").default("/cabs"),
  code: Joi.string().allow("").default(""),
  fare: Joi.string().allow("").default(""),
  validTill: Joi.string().allow("").default(""),
  sortOrder: Joi.number().default(0),
  published: Joi.boolean().default(true)
});

const SEED_BY_SECTION = { offers, services, routes };

let homeCardsReady = false;

async function ensureHomeCards() {
  if (homeCardsReady) return;
  await Offer.updateMany({ $or: [{ section: { $exists: false } }, { section: "" }, { section: null }] }, { $set: { section: "offers" } });

  const remaps = Object.entries(imageRemap);
  await Promise.all(remaps.map(([from, to]) => Offer.updateMany({ image: from }, { $set: { image: to } })));

  for (const section of SECTIONS) {
    const count = await Offer.countDocuments({ section });
    if (count === 0) {
      await Offer.insertMany(SEED_BY_SECTION[section]);
    }
  }
  homeCardsReady = true;
}

async function listOffers(req, res) {
  const isAdmin = req.user && ["super_admin", "vendor_admin"].includes(req.user.role);
  const includeAll = isAdmin && (req.query.includeUnpublished === "1" || req.query.admin === "1");
  try {
    await ensureHomeCards();
  } catch {
    homeCardsReady = false;
  }
  const requested = String(req.query.section || "").trim();
  const section = SECTIONS.includes(requested) ? requested : includeAll ? "" : "offers";
  const filter = includeAll ? {} : { published: true };
  if (section) filter.section = section;
  const data = await Offer.find(filter).sort({ sortOrder: 1, createdAt: -1 }).lean();
  res.json({ success: true, data });
}

async function getOfferById(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, "Invalid id");
  const data = await Offer.findById(req.params.id).lean();
  if (!data) throw new HttpError(404, "Offer not found");
  res.json({ success: true, data });
}

async function createOffer(req, res) {
  const { error, value } = offerSchema.validate(req.body, { stripUnknown: true, convert: true });
  if (error) throw new HttpError(400, error.message);
  const data = await Offer.create(value);
  await logAudit({ req, action: "create", entity: "offer", entityId: data._id, after: data.toObject() });
  res.status(201).json({ success: true, data });
}

async function updateOffer(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, "Invalid id");
  const { error, value } = offerSchema.validate(req.body, { stripUnknown: true, convert: true });
  if (error) throw new HttpError(400, error.message);
  const data = await Offer.findByIdAndUpdate(req.params.id, value, { new: true, runValidators: true });
  if (!data) throw new HttpError(404, "Offer not found");
  await logAudit({ req, action: "update", entity: "offer", entityId: data._id, after: data.toObject() });
  res.json({ success: true, data });
}

async function deleteOffer(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, "Invalid id");
  const data = await Offer.findByIdAndDelete(req.params.id);
  if (!data) throw new HttpError(404, "Offer not found");
  await logAudit({ req, action: "delete", entity: "offer", entityId: data._id, before: data.toObject() });
  res.json({ success: true, message: "Offer deleted" });
}

module.exports = { listOffers, getOfferById, createOffer, updateOffer, deleteOffer };
