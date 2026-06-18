const Joi = require("joi");
const mongoose = require("mongoose");
const { CmsPage } = require("../models/CmsPage");
const { Faq } = require("../models/Faq");
const { Destination } = require("../models/Destination");
const { MediaAsset } = require("../models/MediaAsset");
const { SeoTemplate } = require("../models/SeoTemplate");
const { SearchConsoleSnapshot } = require("../models/SearchConsoleSnapshot");
const { RelatedContent } = require("../models/RelatedContent");
const { ChatLead } = require("../models/ChatLead");
const { Blog } = require("../models/Blog");
const { Testimonial } = require("../models/Testimonial");
const { SeoRoute } = require("../models/SeoRoute");
const { SeoCityPage } = require("../models/SeoCityPage");
const { SeoService } = require("../models/SeoService");
const { City } = require("../models/City");
const { AuditLog } = require("../models/AuditLog");
const { HttpError } = require("../utils/httpError");
const { parseListQuery, paginatedFind } = require("../utils/listQuery");
const { logAudit } = require("../services/auditService");
const { slugify } = require("../utils/slugify");
const { buildSeoFromTemplate, renderTemplate } = require("../utils/templateEngine");
const { isSuperAdminUser } = require("../utils/adminAccess");

const faqItemJoi = Joi.object({
  question: Joi.string().required(),
  answer: Joi.string().allow("").default("")
});

const cmsPageSchema = Joi.object({
  slug: Joi.string().required(),
  title: Joi.string().required(),
  pageType: Joi.string()
    .valid("about", "contact", "privacy", "terms", "refund", "cancellation", "legal", "custom")
    .default("custom"),
  excerpt: Joi.string().allow("").default(""),
  body: Joi.string().allow("").default(""),
  faqs: Joi.array().items(faqItemJoi).default([]),
  seoTitle: Joi.string().allow("").default(""),
  seoDescription: Joi.string().allow("").default(""),
  published: Joi.boolean().default(true),
  sortOrder: Joi.number().default(0)
});

const faqSchema = Joi.object({
  question: Joi.string().required(),
  answer: Joi.string().required(),
  category: Joi.string().allow("").default("general"),
  tags: Joi.array().items(Joi.string()).default([]),
  assignments: Joi.array()
    .items(
      Joi.object({
        entityType: Joi.string().default("global"),
        entityId: Joi.string().allow("").default(""),
        entitySlug: Joi.string().allow("").default("")
      })
    )
    .default([]),
  sortOrder: Joi.number().default(0),
  published: Joi.boolean().default(true)
});

const destinationSchema = Joi.object({
  name: Joi.string().required(),
  slug: Joi.string().required(),
  state: Joi.string().allow("").default(""),
  description: Joi.string().allow("").default(""),
  body: Joi.string().allow("").default(""),
  image: Joi.string().allow("").default(""),
  banner: Joi.string().allow("").default(""),
  gallery: Joi.array().items(Joi.string()).default([]),
  faqs: Joi.array().items(faqItemJoi).default([]),
  seoTitle: Joi.string().allow("").default(""),
  seoDescription: Joi.string().allow("").default(""),
  relatedRouteSlugs: Joi.array().items(Joi.string()).default([]),
  relatedPackageIds: Joi.array().items(Joi.string()).default([]),
  featured: Joi.boolean().default(false),
  sortOrder: Joi.number().default(0),
  published: Joi.boolean().default(true)
});

const mediaSchema = Joi.object({
  url: Joi.string().required(),
  filename: Joi.string().allow("").default(""),
  alt: Joi.string().allow("").default(""),
  title: Joi.string().allow("").default(""),
  folder: Joi.string().allow("").default("general"),
  tags: Joi.array().items(Joi.string()).default([]),
  mimeType: Joi.string().allow("").default(""),
  sizeBytes: Joi.number().default(0)
});

const seoTemplateSchema = Joi.object({
  key: Joi.string().required(),
  label: Joi.string().required(),
  templateType: Joi.string()
    .valid("city", "route", "service", "blog", "destination", "cms-page", "vehicle", "tour")
    .default("city"),
  titleTemplate: Joi.string().required(),
  descriptionTemplate: Joi.string().allow("").default(""),
  keywordsTemplate: Joi.string().allow("").default(""),
  schemaTemplate: Joi.string().allow("").default(""),
  active: Joi.boolean().default(true),
  sortOrder: Joi.number().default(0)
});

const gscSchema = Joi.object({
  keyword: Joi.string().required(),
  clicks: Joi.number().default(0),
  impressions: Joi.number().default(0),
  ctr: Joi.number().default(0),
  position: Joi.number().default(0),
  landingPage: Joi.string().allow("").default(""),
  opportunityScore: Joi.number().default(0),
  snapshotDate: Joi.string().allow("").default("")
});

const relatedSchema = Joi.object({
  sourceType: Joi.string().required(),
  sourceId: Joi.string().allow("").default(""),
  sourceSlug: Joi.string().allow("").default(""),
  relatedType: Joi.string().required(),
  relatedId: Joi.string().allow("").default(""),
  relatedSlug: Joi.string().allow("").default(""),
  label: Joi.string().allow("").default(""),
  sortOrder: Joi.number().default(0),
  autoGenerated: Joi.boolean().default(false)
});

function requireSuperAdmin(req) {
  if (!isSuperAdminUser(req)) throw new HttpError(403, "Super admin only.");
}

async function crudList(Model, req, res, sort = { updatedAt: -1 }) {
  const pq = parseListQuery(req);
  const isAdmin = req.user && ["super_admin", "vendor_admin"].includes(req.user.role);
  const includeAll = isAdmin && (req.query.admin === "1" || req.query.includeUnpublished === "1");
  const filter = includeAll ? {} : { published: true };
  const { data, meta } = await paginatedFind(Model, filter, pq, sort);
  res.json({ success: true, data, meta });
}

async function crudGet(Model, req, res, slugField = "slug") {
  const isAdmin = req.user && ["super_admin", "vendor_admin"].includes(req.user.role);
  const param = req.params.id || req.params.slug;
  let doc;
  if (mongoose.isValidObjectId(param) && isAdmin) {
    doc = await Model.findById(param);
  } else {
    const filter = { [slugField]: slugify(param) };
    if (!isAdmin) filter.published = true;
    doc = await Model.findOne(filter);
  }
  if (!doc) throw new HttpError(404, "Not found");
  res.json({ success: true, data: doc });
}

async function crudCreate(Model, req, res, schema, entityName) {
  requireSuperAdmin(req);
  const { error, value } = schema.validate(req.body, { stripUnknown: true, convert: true });
  if (error) throw new HttpError(400, error.message);
  if (value.slug) value.slug = slugify(value.slug);
  const data = await Model.create(value);
  await logAudit({ req, action: "create", entity: entityName, entityId: data._id, after: data.toObject() });
  res.status(201).json({ success: true, data });
}

async function crudUpdate(Model, req, res, schema, entityName) {
  requireSuperAdmin(req);
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, "Invalid id");
  const { error, value } = schema.validate(req.body, { stripUnknown: true, convert: true });
  if (error) throw new HttpError(400, error.message);
  if (value.slug) value.slug = slugify(value.slug);
  const data = await Model.findByIdAndUpdate(req.params.id, value, { new: true, runValidators: true });
  if (!data) throw new HttpError(404, "Not found");
  await logAudit({ req, action: "update", entity: entityName, entityId: data._id, after: data.toObject() });
  res.json({ success: true, data });
}

async function crudDelete(Model, req, res, entityName) {
  requireSuperAdmin(req);
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, "Invalid id");
  const data = await Model.findByIdAndDelete(req.params.id);
  if (!data) throw new HttpError(404, "Not found");
  await logAudit({ req, action: "delete", entity: entityName, entityId: data._id, before: data.toObject() });
  res.json({ success: true, message: "Deleted" });
}

const DEFAULT_SEO_TEMPLATES = [
  {
    key: "city-taxi",
    label: "City taxi service",
    templateType: "city",
    titleTemplate: "{City} Taxi Service | Airport, Local & Outstation | Cabzii",
    descriptionTemplate:
      "Book airport taxi, local taxi and outstation cabs in {City}. Verified drivers and upfront fares on cabzii.in.",
    keywordsTemplate: "cab booking {City},taxi {City},outstation cab {City}"
  },
  {
    key: "route-oneway",
    label: "One-way route",
    templateType: "route",
    titleTemplate: "{FromCity} to {ToCity} Taxi Service | Cabzii",
    descriptionTemplate: "Book {FromCity} to {ToCity} cab online. Sedan, SUV & Innova with transparent fares on cabzii.in.",
    keywordsTemplate: "{FromCity} to {ToCity} cab,{FromCity} {ToCity} taxi fare"
  }
];

async function ensureDefaultSeoTemplates() {
  const count = await SeoTemplate.countDocuments();
  if (count === 0) await SeoTemplate.insertMany(DEFAULT_SEO_TEMPLATES);
}

// CMS Pages
async function listCmsPages(req, res) {
  return crudList(CmsPage, req, res, { sortOrder: 1, title: 1 });
}
async function getCmsPageBySlug(req, res) {
  const isAdmin = req.user && ["super_admin", "vendor_admin"].includes(req.user.role);
  const slug = slugify(req.params.slug);
  const filter = { slug };
  if (!isAdmin) filter.published = true;
  const doc = await CmsPage.findOne(filter);
  if (!doc) throw new HttpError(404, "Not found");
  res.json({ success: true, data: doc });
}
async function createCmsPage(req, res) {
  return crudCreate(CmsPage, req, res, cmsPageSchema, "cms-page");
}
async function updateCmsPage(req, res) {
  return crudUpdate(CmsPage, req, res, cmsPageSchema, "cms-page");
}
async function deleteCmsPage(req, res) {
  return crudDelete(CmsPage, req, res, "cms-page");
}

// FAQs
async function listFaqs(req, res) {
  const pq = parseListQuery(req);
  const filter = {};
  if (req.query.category) filter.category = req.query.category;
  if (req.query.entityType) filter["assignments.entityType"] = req.query.entityType;
  if (req.query.entitySlug) filter["assignments.entitySlug"] = req.query.entitySlug;
  const { data, meta } = await paginatedFind(Faq, filter, pq, { sortOrder: 1 });
  res.json({ success: true, data, meta });
}
async function createFaq(req, res) {
  return crudCreate(Faq, req, res, faqSchema, "faq");
}
async function updateFaq(req, res) {
  return crudUpdate(Faq, req, res, faqSchema, "faq");
}
async function deleteFaq(req, res) {
  return crudDelete(Faq, req, res, "faq");
}

// Destinations
async function listDestinations(req, res) {
  return crudList(Destination, req, res, { sortOrder: 1, name: 1 });
}
async function createDestination(req, res) {
  return crudCreate(Destination, req, res, destinationSchema, "destination");
}
async function updateDestination(req, res) {
  return crudUpdate(Destination, req, res, destinationSchema, "destination");
}
async function deleteDestination(req, res) {
  return crudDelete(Destination, req, res, "destination");
}

// Media
async function listMediaAssets(req, res) {
  const pq = parseListQuery(req);
  const filter = {};
  if (req.query.folder) filter.folder = req.query.folder;
  if (req.query.q) {
    filter.$or = [
      { filename: new RegExp(req.query.q, "i") },
      { alt: new RegExp(req.query.q, "i") },
      { tags: req.query.q }
    ];
  }
  const { data, meta } = await paginatedFind(MediaAsset, filter, pq, { createdAt: -1 });
  res.json({ success: true, data, meta });
}
async function createMediaAsset(req, res) {
  return crudCreate(MediaAsset, req, res, mediaSchema, "media");
}
async function updateMediaAsset(req, res) {
  return crudUpdate(MediaAsset, req, res, mediaSchema, "media");
}
async function deleteMediaAsset(req, res) {
  return crudDelete(MediaAsset, req, res, "media");
}

// SEO Templates
async function listSeoTemplates(req, res) {
  requireSuperAdmin(req);
  await ensureDefaultSeoTemplates();
  const data = await SeoTemplate.find({}).sort({ sortOrder: 1, label: 1 }).lean();
  res.json({ success: true, data });
}
async function createSeoTemplate(req, res) {
  return crudCreate(SeoTemplate, req, res, seoTemplateSchema, "seo-template");
}
async function updateSeoTemplate(req, res) {
  return crudUpdate(SeoTemplate, req, res, seoTemplateSchema, "seo-template");
}
async function deleteSeoTemplate(req, res) {
  return crudDelete(SeoTemplate, req, res, "seo-template");
}

async function renderSeoPreview(req, res) {
  requireSuperAdmin(req);
  const template = await SeoTemplate.findOne({ key: req.body.templateKey || req.query.templateKey });
  if (!template) throw new HttpError(404, "Template not found");
  const vars = req.body.vars || req.query || {};
  res.json({ success: true, data: buildSeoFromTemplate(template, vars) });
}

// Search Console
async function listSearchConsole(req, res) {
  requireSuperAdmin(req);
  const pq = parseListQuery(req);
  const filter = {};
  if (req.query.minPosition) filter.position = { $gte: Number(req.query.minPosition) };
  if (req.query.maxPosition) filter.position = { ...(filter.position || {}), $lte: Number(req.query.maxPosition) };
  const { data, meta } = await paginatedFind(SearchConsoleSnapshot, filter, pq, { position: 1 });
  res.json({ success: true, data, meta });
}
async function importSearchConsole(req, res) {
  requireSuperAdmin(req);
  const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
  if (!rows.length) throw new HttpError(400, "No rows to import.");
  const docs = [];
  for (const row of rows.slice(0, 5000)) {
    const { error, value } = gscSchema.validate(row, { stripUnknown: true, convert: true });
    if (!error) docs.push(value);
  }
  await SearchConsoleSnapshot.deleteMany({ snapshotDate: docs[0]?.snapshotDate || "" });
  const inserted = await SearchConsoleSnapshot.insertMany(docs, { ordered: false });
  res.json({ success: true, data: { imported: inserted.length } });
}

// Related content
async function listRelatedContent(req, res) {
  requireSuperAdmin(req);
  const filter = {};
  if (req.query.sourceType) filter.sourceType = req.query.sourceType;
  if (req.query.sourceSlug) filter.sourceSlug = req.query.sourceSlug;
  const data = await RelatedContent.find(filter).sort({ sortOrder: 1 }).lean();
  res.json({ success: true, data });
}
async function createRelatedContent(req, res) {
  return crudCreate(RelatedContent, req, res, relatedSchema, "related-content");
}
async function updateRelatedContent(req, res) {
  return crudUpdate(RelatedContent, req, res, relatedSchema, "related-content");
}
async function deleteRelatedContent(req, res) {
  return crudDelete(RelatedContent, req, res, "related-content");
}

// Chat leads (admin list)
async function listChatLeadsAdmin(req, res) {
  requireSuperAdmin(req);
  const pq = parseListQuery(req);
  const { data, meta } = await paginatedFind(ChatLead, {}, pq, { createdAt: -1 });
  res.json({ success: true, data, meta });
}

// Audit logs (reuse existing model)
async function listAuditLogsAdmin(req, res) {
  requireSuperAdmin(req);
  const limit = Math.min(500, Number(req.query.limit) || 100);
  const data = await AuditLog.find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  res.json({ success: true, data });
}

// Enterprise analytics + content health
async function enterpriseDashboard(req, res) {
  requireSuperAdmin(req);

  const [
    cmsPages,
    faqs,
    destinations,
    mediaCount,
    blogs,
    testimonials,
    seoRoutes,
    seoServices,
    seoCityPages,
    cities,
    chatLeads,
    gscRows
  ] = await Promise.all([
    CmsPage.countDocuments(),
    Faq.countDocuments(),
    Destination.countDocuments({ published: true }),
    MediaAsset.countDocuments(),
    Blog.countDocuments(),
    Testimonial.countDocuments({ published: true }),
    SeoRoute.countDocuments({ published: true }),
    SeoService.countDocuments({ published: true }),
    SeoCityPage.countDocuments({ published: true }),
    City.countDocuments({ isActive: true }),
    ChatLead.countDocuments(),
    SearchConsoleSnapshot.countDocuments()
  ]);

  const thinMetaRoutes = await SeoRoute.countDocuments({
    $or: [{ seoDescription: "" }, { seoDescription: { $exists: false } }]
  });
  const thinMetaServices = await SeoService.countDocuments({
    $or: [{ seoDescription: "" }, { seoDescription: { $exists: false } }]
  });
  const unpublishedBlogs = await Blog.countDocuments({ published: false });
  const gscOpportunities = await SearchConsoleSnapshot.find({ position: { $gte: 5, $lte: 50 } })
    .sort({ impressions: -1 })
    .limit(20)
    .lean();

  res.json({
    success: true,
    data: {
      counts: {
        cmsPages,
        faqs,
        destinations,
        mediaCount,
        blogs,
        testimonials,
        seoRoutes,
        seoServices,
        seoCityPages,
        cities,
        chatLeads,
        gscRows
      },
      contentHealth: {
        thinMetaRoutes,
        thinMetaServices,
        unpublishedBlogs,
        missingFaqPages: thinMetaRoutes + thinMetaServices,
        suggestions: [
          thinMetaRoutes > 0 ? `${thinMetaRoutes} route pages missing meta descriptions` : null,
          thinMetaServices > 0 ? `${thinMetaServices} service pages missing meta descriptions` : null,
          faqs === 0 ? "Create global FAQs in Enterprise CMS" : null
        ].filter(Boolean)
      },
      gscOpportunities
    }
  });
}

// AI content assistant (template-based, no external API)
async function generateAiDraft(req, res) {
  requireSuperAdmin(req);
  const { type, vars = {} } = req.body || {};
  const templateKey = req.body.templateKey || (type === "route" ? "route-oneway" : "city-taxi");
  const template = await SeoTemplate.findOne({ key: templateKey, active: true });
  const seo = template ? buildSeoFromTemplate(template, vars) : {};

  let body = "";
  if (type === "city") {
    body = `<p>Book reliable taxi and cab services in ${vars.City || vars.city || "your city"} with Cabzii. Airport transfers, local packages, and outstation trips with verified drivers and upfront fares.</p>`;
  } else if (type === "route") {
    body = `<p>Travel from ${vars.FromCity || vars.fromCity} to ${vars.ToCity || vars.toCity} with comfortable sedans, SUVs and Innova. Transparent pricing and 24×7 support on cabzii.in.</p>`;
  } else if (type === "faq") {
    return res.json({
      success: true,
      data: {
        question: `How do I book a cab in ${vars.City || "Chennai"}?`,
        answer: "Enter pickup and drop on cabzii.in, choose your vehicle, and confirm with OTP-secure booking."
      }
    });
  } else if (type === "blog") {
    body = `<p>Planning a trip from ${vars.FromCity || "Chennai"}? Here’s a practical guide to booking cabs, comparing fares, and choosing the right vehicle on Cabzii.</p>`;
  }

  res.json({
    success: true,
    data: {
      seoTitle: seo.title,
      seoDescription: seo.description,
      keywords: seo.keywords,
      body,
      schemaJson: template?.schemaTemplate ? renderTemplate(template.schemaTemplate, vars) : ""
    }
  });
}

// Bulk import
async function bulkImport(req, res) {
  requireSuperAdmin(req);
  const { entity, rows } = req.body || {};
  if (!entity || !Array.isArray(rows) || !rows.length) {
    throw new HttpError(400, "entity and rows[] required.");
  }

  let imported = 0;
  const errors = [];

  for (let i = 0; i < Math.min(rows.length, 500); i += 1) {
    try {
      const row = rows[i];
      if (entity === "faqs") {
        const { error, value } = faqSchema.validate(row, { stripUnknown: true, convert: true });
        if (error) throw error;
        await Faq.create(value);
      } else if (entity === "destinations") {
        const { error, value } = destinationSchema.validate(row, { stripUnknown: true, convert: true });
        if (error) throw error;
        value.slug = slugify(value.slug || value.name);
        await Destination.create(value);
      } else if (entity === "cms-pages") {
        const { error, value } = cmsPageSchema.validate(row, { stripUnknown: true, convert: true });
        if (error) throw error;
        value.slug = slugify(value.slug);
        await CmsPage.create(value);
      } else if (entity === "gsc") {
        const { error, value } = gscSchema.validate(row, { stripUnknown: true, convert: true });
        if (error) throw error;
        await SearchConsoleSnapshot.create(value);
      } else {
        throw new Error(`Unsupported entity: ${entity}`);
      }
      imported += 1;
    } catch (err) {
      errors.push({ row: i + 1, message: err.message });
    }
  }

  res.json({ success: true, data: { imported, errors } });
}

module.exports = {
  listCmsPages,
  getCmsPageBySlug,
  createCmsPage,
  updateCmsPage,
  deleteCmsPage,
  listFaqs,
  createFaq,
  updateFaq,
  deleteFaq,
  listDestinations,
  createDestination,
  updateDestination,
  deleteDestination,
  listMediaAssets,
  createMediaAsset,
  updateMediaAsset,
  deleteMediaAsset,
  listSeoTemplates,
  createSeoTemplate,
  updateSeoTemplate,
  deleteSeoTemplate,
  renderSeoPreview,
  listSearchConsole,
  importSearchConsole,
  listRelatedContent,
  createRelatedContent,
  updateRelatedContent,
  deleteRelatedContent,
  listChatLeadsAdmin,
  listAuditLogsAdmin,
  enterpriseDashboard,
  generateAiDraft,
  bulkImport
};
