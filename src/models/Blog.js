const mongoose = require("mongoose");

const blogSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true },
    title: { type: String, required: true, trim: true },
    excerpt: { type: String, default: "" },
    body: { type: String, default: "" },
    author: { type: String, default: "Cabzii Editorial" },
    date: { type: String, default: "" },
    category: { type: String, default: "travel", trim: true },
    tags: { type: [String], default: [] },
    coverImage: { type: String, default: "", trim: true },
    featured: { type: Boolean, default: false },
    scheduledAt: { type: Date, default: null },
    status: { type: String, enum: ["draft", "scheduled", "published"], default: "published" },
    relatedSlugs: { type: [String], default: [] },
    seo: { type: String, default: "" },
    seoTitle: { type: String, default: "" },
    seoDescription: { type: String, default: "" },
    canonicalUrl: { type: String, default: "", trim: true },
    robots: { type: String, default: "index,follow", trim: true },
    ogImage: { type: String, default: "", trim: true },
    published: { type: Boolean, default: true }
  },
  { timestamps: true }
);

blogSchema.index({ category: 1, published: 1 });
blogSchema.index({ featured: 1, published: 1 });

const Blog = mongoose.model("Blog", blogSchema);

module.exports = { Blog };
