const express = require("express");
const { listCustomers, getCustomerById, createCustomer } = require("../controllers/customerController");
const { asyncHandler } = require("../utils/asyncHandler");
const { requireAuth } = require("../middlewares/auth");

const router = express.Router();

router.get("/", requireAuth, asyncHandler(listCustomers));
router.post("/", requireAuth, asyncHandler(createCustomer));
router.get("/:id", requireAuth, asyncHandler(getCustomerById));

module.exports = router;
