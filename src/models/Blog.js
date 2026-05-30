const mongoose = require("mongoose");

const blogSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true },
    title: { type: String, required: true, trim: true },
    excerpt: { type: String, default: "" },
    body: { type: String, default: "" },
    author: { type: String, default: "Cabzii Editorial" },
    date: { type: String, default: "" },
    seo: { type: String, default: "" },
    seoTitle: { type: String, default: "" },
    seoDescription: { type: String, default: "" },
    published: { type: Boolean, default: true }
  },
  { timestamps: true }
);

const Blog = mongoose.model("Blog", blogSchema);

module.exports = { Blog };
