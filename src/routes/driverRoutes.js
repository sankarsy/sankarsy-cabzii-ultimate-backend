const express = require("express");
const { createDriver, deleteDriver, getDriverById, listDrivers, updateDriver } = require("../controllers/driverController");
const { asyncHandler } = require("../utils/asyncHandler");
const { optionalAuth, requireAuth, requireRole } = require("../middlewares/auth");

const router = express.Router();

router.get("/", optionalAuth, asyncHandler(listDrivers));
router.get("/:id", optionalAuth, asyncHandler(getDriverById));
router.post("/", requireAuth, requireRole("super_admin", "vendor_admin"), asyncHandler(createDriver));
router.put("/:id", requireAuth, requireRole("super_admin", "vendor_admin"), asyncHandler(updateDriver));
router.delete("/:id", requireAuth, requireRole("super_admin", "vendor_admin"), asyncHandler(deleteDriver));

module.exports = router;
