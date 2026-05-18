const express = require("express");
const { createCab, deleteCab, getCabById, listCabs, updateCab } = require("../controllers/cabController");
const { asyncHandler } = require("../utils/asyncHandler");
const { optionalAuth, requireAuth, requireRole } = require("../middlewares/auth");

const router = express.Router();

router.get("/", optionalAuth, asyncHandler(listCabs));
router.get("/:id", optionalAuth, asyncHandler(getCabById));
router.post("/", requireAuth, requireRole("super_admin", "vendor_admin"), asyncHandler(createCab));
router.put("/:id", requireAuth, requireRole("super_admin", "vendor_admin"), asyncHandler(updateCab));
router.delete("/:id", requireAuth, requireRole("super_admin", "vendor_admin"), asyncHandler(deleteCab));

module.exports = router;
