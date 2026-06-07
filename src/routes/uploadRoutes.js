const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { requireAuth, requireRole } = require("../middlewares/auth");

const router = express.Router();

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const base = (path.basename(file.originalname || "upload", ext) || "upload")
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9_-]/g, "");
    cb(null, `${Date.now()}-${base}${ext || ".jpg"}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.mimetype)) {
      cb(new Error("Only jpg, jpeg, png, and webp are allowed."));
      return;
    }
    cb(null, true);
  }
});

router.post(
  "/",
  requireAuth,
  requireRole("super_admin", "vendor_admin"),
  upload.single("file"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Image file is required." });
    }
    const relativeUrl = `/uploads/${req.file.filename}`;
    return res.status(201).json({
      success: true,
      data: {
        fileName: req.file.filename,
        url: relativeUrl,
        relativeUrl
      }
    });
  }
);

module.exports = router;
