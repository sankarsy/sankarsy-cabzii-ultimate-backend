const express = require("express");
const { listSeoMenu } = require("../controllers/seoMenuController");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.get("/", asyncHandler(listSeoMenu));

module.exports = router;
