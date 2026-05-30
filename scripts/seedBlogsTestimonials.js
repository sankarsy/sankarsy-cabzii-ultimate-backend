"use strict";

/** Seed only blogs and testimonials (does not delete cabs/drivers/packages). */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const path = require("path");
const { blogs, testimonials } = require("./contentData");
const { Blog } = require(path.join(__dirname, "..", "src", "models", "Blog"));
const { Testimonial } = require(path.join(__dirname, "..", "src", "models", "Testimonial"));

function slugifyTitle(title) {
  return String(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function toBlogDoc(post) {
  const { id, ...rest } = post;
  return {
    ...rest,
    slug: `post-${id}-${slugifyTitle(post.title)}`,
    published: true
  };
}

function toTestimonialDoc(item, index) {
  const { id, ...rest } = item;
  return { ...rest, sortOrder: index, published: true };
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Missing MONGODB_URI in cabzii-ultimate-backend/.env");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  const blogR = await Blog.deleteMany({});
  const testR = await Testimonial.deleteMany({});
  console.log(`Cleared blogs=${blogR.deletedCount} testimonials=${testR.deletedCount}`);

  const insertedBlogs = await Blog.insertMany(blogs.map(toBlogDoc));
  const insertedTestimonials = await Testimonial.insertMany(testimonials.map(toTestimonialDoc));

  console.log(`Inserted blogs=${insertedBlogs.length} testimonials=${insertedTestimonials.length}`);
  insertedBlogs.forEach((b) => console.log(`  blog: /blog/${b.slug}`));

  await mongoose.disconnect();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
