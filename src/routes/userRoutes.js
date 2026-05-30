const express = require("express");
const { listCustomers, getCustomer } = require("../controllers/userController");
const { asyncHandler } = require("../utils/asyncHandler");
const { requireAuth, requireRole } = require("../middlewares/auth");

const router = express.Router();

router.get("/", requireAuth, requireRole("super_admin"), asyncHandler(listCustomers));
router.get("/:id", requireAuth, requireRole("super_admin"), asyncHandler(getCustomer));

module.exports = router;
