const express = require("express");
const {
  listBlogs,
  getBlogBySlug,
  createBlog,
  updateBlog,
  deleteBlog
} = require("../controllers/blogController");
const { asyncHandler } = require("../utils/asyncHandler");
const { optionalAuth, requireAuth, requireRole } = require("../middlewares/auth");

const router = express.Router();

router.get("/", optionalAuth, asyncHandler(listBlogs));
router.post("/", requireAuth, requireRole("super_admin"), asyncHandler(createBlog));
router.put("/:id", requireAuth, requireRole("super_admin"), asyncHandler(updateBlog));
router.delete("/:id", requireAuth, requireRole("super_admin"), asyncHandler(deleteBlog));
router.get("/:slug", optionalAuth, asyncHandler(getBlogBySlug));

module.exports = router;
