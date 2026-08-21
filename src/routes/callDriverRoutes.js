const express = require("express");
const { listCallDriverServices, quoteCallDriverService } = require("../controllers/callDriverController");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.get("/", asyncHandler(listCallDriverServices));
router.post("/quote", asyncHandler(quoteCallDriverService));

module.exports = router;
