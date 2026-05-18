const express = require("express");
const {
  listLocations,
  getLocationById,
  createLocation,
  updateLocation,
  deleteLocation
} = require("../controllers/locationController");
const { asyncHandler } = require("../utils/asyncHandler");
const { requireAuth, requireRole } = require("../middlewares/auth");

const router = express.Router();

router.get("/", asyncHandler(listLocations));
router.get("/:id", asyncHandler(getLocationById));
router.post("/", requireAuth, requireRole("super_admin"), asyncHandler(createLocation));
router.put("/:id", requireAuth, requireRole("super_admin"), asyncHandler(updateLocation));
router.delete("/:id", requireAuth, requireRole("super_admin"), asyncHandler(deleteLocation));

module.exports = router;
