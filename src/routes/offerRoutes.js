const express = require("express");
const {
  listOffers,
  getOfferById,
  createOffer,
  updateOffer,
  deleteOffer
} = require("../controllers/offerController");
const { asyncHandler } = require("../utils/asyncHandler");
const { optionalAuth, requireAuth, requireRole } = require("../middlewares/auth");

const router = express.Router();

router.get("/", optionalAuth, asyncHandler(listOffers));
router.post("/", requireAuth, requireRole("super_admin"), asyncHandler(createOffer));
router.get("/:id", requireAuth, requireRole("super_admin"), asyncHandler(getOfferById));
router.put("/:id", requireAuth, requireRole("super_admin"), asyncHandler(updateOffer));
router.delete("/:id", requireAuth, requireRole("super_admin"), asyncHandler(deleteOffer));

module.exports = router;
