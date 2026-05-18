const express = require("express");
const {
  listVendors,
  getVendorById,
  createVendor,
  updateVendor,
  deleteVendor
} = require("../controllers/vendorController");
const { asyncHandler } = require("../utils/asyncHandler");
const { optionalAuth, requireAuth, requireRole } = require("../middlewares/auth");

const router = express.Router();

router.get("/", optionalAuth, asyncHandler(listVendors));
router.get("/:id", requireAuth, requireRole("super_admin", "vendor_admin"), asyncHandler(getVendorById));
router.post("/", requireAuth, requireRole("super_admin"), asyncHandler(createVendor));
router.put("/:id", requireAuth, requireRole("super_admin"), asyncHandler(updateVendor));
router.delete("/:id", requireAuth, requireRole("super_admin"), asyncHandler(deleteVendor));

module.exports = router;
