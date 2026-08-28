const fs = require("fs");
const path = require("path");
const express = require("express");
const multer = require("multer");
const { requireAuth, requireRole } = require("../middlewares/auth");
const { IMAGE_UPLOAD_RULES, sizeErrorMessage } = require("../utils/imageUploadRules");

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
  limits: { fileSize: IMAGE_UPLOAD_RULES.maxBytes },
  fileFilter: (req, file, cb) => {
    if (!IMAGE_UPLOAD_RULES.mimeTypes.includes(file.mimetype)) {
      cb(new Error("Only jpg, jpeg, png, and webp are allowed."));
      return;
    }
    cb(null, true);
  }
});

function runUpload(req, res, next) {
  upload.single("file")(req, res, (err) => {
    if (!err) {
      next();
      return;
    }
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: `Maximum allowed size is ${IMAGE_UPLOAD_RULES.maxMb} MB.`
      });
    }
    return res.status(400).json({ success: false, message: err.message || "Upload failed." });
  });
}

router.post("/", requireAuth, requireRole("super_admin", "vendor_admin"), runUpload, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "Image file is required." });
  }
  const filePath = req.file.path;
  if (req.file.size > IMAGE_UPLOAD_RULES.maxBytes) {
    fs.unlinkSync(filePath);
    return res.status(400).json({ success: false, message: sizeErrorMessage(req.file.size) });
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
});

/** Delete an uploaded file from disk (admin only). Body: { path: "/uploads/filename.jpg" } */
router.delete("/", requireAuth, requireRole("super_admin", "vendor_admin"), (req, res) => {
  const raw = String(req.body?.path || req.query?.path || "").trim();
  if (!raw) {
    return res.status(400).json({ success: false, message: "Image path is required." });
  }
  const normalized = raw.replace(/\\/g, "/");
  const match = normalized.match(/\/uploads\/([^/?#]+)$/i) || normalized.match(/^uploads\/([^/?#]+)$/i);
  if (!match) {
    return res.status(400).json({ success: false, message: "Only files under /uploads/ can be deleted." });
  }
  const filename = match[1].replace(/\.\./g, "");
  const filePath = path.join(uploadsDir, filename);
  if (!filePath.startsWith(uploadsDir)) {
    return res.status(400).json({ success: false, message: "Invalid file path." });
  }
  if (!fs.existsSync(filePath)) {
    return res.json({ success: true, message: "File already removed.", data: { path: `/uploads/${filename}` } });
  }
  try {
    fs.unlinkSync(filePath);
    return res.json({ success: true, message: "Image deleted.", data: { path: `/uploads/${filename}` } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || "Could not delete image." });
  }
});

module.exports = router;
