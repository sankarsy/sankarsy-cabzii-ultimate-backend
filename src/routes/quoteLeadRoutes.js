const express = require("express");
const { asyncHandler } = require("../utils/asyncHandler");
const { optionalAuth, requireAuth } = require("../middlewares/auth");
const { publicEnquiryLimiter } = require("../middlewares/rateLimit");
const {
  createPublicQuoteLead,
  getPublicQuote,
  getPublicQuotePdf,
  listQuoteLeads,
  updateQuoteLeadStage
} = require("../controllers/quoteLeadController");

const router = express.Router();

router.post("/", publicEnquiryLimiter, optionalAuth, asyncHandler(createPublicQuoteLead));
router.get("/public/:quoteRef/pdf", asyncHandler(getPublicQuotePdf));
router.get("/public/:quoteRef", asyncHandler(getPublicQuote));
router.get("/", requireAuth, asyncHandler(listQuoteLeads));
router.patch("/:id", requireAuth, asyncHandler(updateQuoteLeadStage));

module.exports = router;
