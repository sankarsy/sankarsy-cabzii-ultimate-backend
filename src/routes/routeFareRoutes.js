const express = require("express");
const {
  listRouteFares,
  createRouteFare,
  updateRouteFare,
  deleteRouteFare
} = require("../controllers/routeFareController");
const { asyncHandler } = require("../utils/asyncHandler");
const { requireAuth, requireRole, optionalAuth } = require("../middlewares/auth");

const router = express.Router();

router.get("/", optionalAuth, asyncHandler(listRouteFares));
router.post("/", requireAuth, requireRole("super_admin"), asyncHandler(createRouteFare));
router.put("/:id", requireAuth, requireRole("super_admin"), asyncHandler(updateRouteFare));
router.delete("/:id", requireAuth, requireRole("super_admin"), asyncHandler(deleteRouteFare));

module.exports = router;
