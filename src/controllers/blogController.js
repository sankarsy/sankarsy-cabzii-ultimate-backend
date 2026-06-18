const { Blog } = require("../models/Blog");
const { HttpError } = require("../utils/httpError");
const { parseListQuery, paginatedFind } = require("../utils/listQuery");
const { logAudit } = require("../services/auditService");
const Joi = require("joi");
const mongoose = require("mongoose");

const blogSchema = Joi.object({
  slug: Joi.string().required(),
  title: Joi.string().required(),
  excerpt: Joi.string().allow("").default(""),
  body: Joi.string().allow("").default(""),
  author: Joi.string().allow("").default("Cabzii Editorial"),
  date: Joi.string().allow("").default(""),
  category: Joi.string().allow("").default("travel"),
  tags: Joi.array().items(Joi.string()).default([]),
  coverImage: Joi.string().allow("").default(""),
  featured: Joi.boolean().default(false),
  scheduledAt: Joi.date().allow(null).default(null),
  status: Joi.string().valid("draft", "scheduled", "published").default("published"),
  relatedSlugs: Joi.array().items(Joi.string()).default([]),
  seo: Joi.string().allow("").default(""),
  seoTitle: Joi.string().allow("").default(""),
  seoDescription: Joi.string().allow("").default(""),
  canonicalUrl: Joi.string().allow("").default(""),
  robots: Joi.string().allow("").default("index,follow"),
  ogImage: Joi.string().allow("").default(""),
  published: Joi.boolean().default(true)
});

async function listBlogs(req, res) {
  const pq = parseListQuery(req);
  const isAdmin = req.user && ["super_admin", "vendor_admin"].includes(req.user.role);
  const includeAll = isAdmin && (req.query.includeUnpublished === "1" || req.query.admin === "1");
  const filter = includeAll ? {} : { published: true };
  const { data, meta } = await paginatedFind(Blog, filter, pq, { createdAt: -1 });
  res.json({ success: true, data, meta });
}

async function getBlogBySlug(req, res) {
  const isAdmin = req.user && ["super_admin", "vendor_admin"].includes(req.user.role);
  const param = req.params.slug;
  let doc;
  if (mongoose.isValidObjectId(param) && isAdmin) {
    doc = await Blog.findById(param);
  } else {
    const filter = isAdmin ? { slug: param } : { slug: param, published: true };
    doc = await Blog.findOne(filter);
  }
  if (!doc) {
    return res.status(404).json({ success: false, message: "Blog not found" });
  }
  res.json({ success: true, data: doc });
}

async function createBlog(req, res) {
  const { error, value } = blogSchema.validate(req.body, { stripUnknown: true, convert: true });
  if (error) throw new HttpError(400, error.message);
  const data = await Blog.create(value);
  await logAudit({ req, action: "create", entity: "blog", entityId: data._id, after: data.toObject() });
  res.status(201).json({ success: true, data });
}

async function updateBlog(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, "Invalid id");
  const { error, value } = blogSchema.validate(req.body, { stripUnknown: true, convert: true });
  if (error) throw new HttpError(400, error.message);
  const data = await Blog.findByIdAndUpdate(req.params.id, value, { new: true, runValidators: true });
  if (!data) throw new HttpError(404, "Blog not found");
  await logAudit({ req, action: "update", entity: "blog", entityId: data._id, after: data.toObject() });
  res.json({ success: true, data });
}

async function deleteBlog(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, "Invalid id");
  const data = await Blog.findByIdAndDelete(req.params.id);
  if (!data) throw new HttpError(404, "Blog not found");
  await logAudit({ req, action: "delete", entity: "blog", entityId: data._id, before: data.toObject() });
  res.json({ success: true, message: "Blog deleted" });
}

module.exports = { listBlogs, getBlogBySlug, createBlog, updateBlog, deleteBlog };
