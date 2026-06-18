const express = require("express");
const { listCities, getCityById, createCity, updateCity, deleteCity, bulkUpdateCities } = require("../controllers/cityController");
const { asyncHandler } = require("../utils/asyncHandler");
const { requireAuth, requireRole } = require("../middlewares/auth");

const router = express.Router();

router.get("/", asyncHandler(listCities));
router.get("/:id", asyncHandler(getCityById));
router.post("/", requireAuth, requireRole("super_admin"), asyncHandler(createCity));
router.post("/bulk-update", requireAuth, requireRole("super_admin"), asyncHandler(bulkUpdateCities));
router.put("/:id", requireAuth, requireRole("super_admin"), asyncHandler(updateCity));
router.delete("/:id", requireAuth, requireRole("super_admin"), asyncHandler(deleteCity));

module.exports = router;
