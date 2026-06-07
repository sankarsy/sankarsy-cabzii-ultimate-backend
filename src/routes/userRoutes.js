const express = require("express");
const { listCustomers, getCustomerById } = require("../controllers/customerController");
const { asyncHandler } = require("../utils/asyncHandler");
const { requireAuth } = require("../middlewares/auth");

const router = express.Router();

router.get("/", requireAuth, asyncHandler(listCustomers));
router.get("/:id", requireAuth, asyncHandler(getCustomerById));

module.exports = router;
