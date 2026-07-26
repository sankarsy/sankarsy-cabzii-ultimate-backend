const express = require("express");
const {
  listBuses,
  getBusById,
  createBus,
  updateBus,
  deleteBus,
  importSampleBuses
} = require("../controllers/busController");
const { asyncHandler } = require("../utils/asyncHandler");
const { optionalAuth, requireAuth, requireRole } = require("../middlewares/auth");

const router = express.Router();

router.get("/", optionalAuth, asyncHandler(listBuses));
router.post("/import-sample", requireAuth, requireRole("super_admin", "vendor_admin"), asyncHandler(importSampleBuses));
router.post("/", requireAuth, requireRole("super_admin", "vendor_admin"), asyncHandler(createBus));
router.get("/:id", optionalAuth, asyncHandler(getBusById));
router.put("/:id", requireAuth, requireRole("super_admin", "vendor_admin"), asyncHandler(updateBus));
router.delete("/:id", requireAuth, requireRole("super_admin", "vendor_admin"), asyncHandler(deleteBus));

module.exports = router;
