const express = require("express");
const { createPackage, deletePackage, getPackageById, listPackages, updatePackage } = require("../controllers/packageController");
const { asyncHandler } = require("../utils/asyncHandler");
const { optionalAuth, requireAuth, requireRole } = require("../middlewares/auth");

const router = express.Router();

router.get("/", optionalAuth, asyncHandler(listPackages));
router.get("/:id", optionalAuth, asyncHandler(getPackageById));
router.post("/", requireAuth, requireRole("super_admin", "vendor_admin"), asyncHandler(createPackage));
router.put("/:id", requireAuth, requireRole("super_admin", "vendor_admin"), asyncHandler(updatePackage));
router.delete("/:id", requireAuth, requireRole("super_admin", "vendor_admin"), asyncHandler(deletePackage));

module.exports = router;
