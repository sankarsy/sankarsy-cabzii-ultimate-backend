const express = require("express");
const { createChatLead, appendChatMessages, listChatLeads } = require("../controllers/chatLeadController");
const { asyncHandler } = require("../utils/asyncHandler");
const { requireAuth, requireRole } = require("../middlewares/auth");

const router = express.Router();

router.post("/", asyncHandler(createChatLead));
router.post("/messages", asyncHandler(appendChatMessages));
router.get("/", requireAuth, requireRole("super_admin"), asyncHandler(listChatLeads));

module.exports = router;
