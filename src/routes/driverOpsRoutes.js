"use strict";

const express = require("express");
const { listDriverTrips, getDriverTrip, startDriverTrip, finishDriverTrip, pingDriverTripLocation } = require("../controllers/driverOpsController");
const { asyncHandler } = require("../utils/asyncHandler");
const { requireAuth, requireRole } = require("../middlewares/auth");

const router = express.Router();

router.get("/trips", requireAuth, requireRole("driver"), asyncHandler(listDriverTrips));
router.get("/trips/:id", requireAuth, requireRole("driver"), asyncHandler(getDriverTrip));
router.post("/trips/:id/start", requireAuth, requireRole("driver"), asyncHandler(startDriverTrip));
router.post("/trips/:id/finish", requireAuth, requireRole("driver"), asyncHandler(finishDriverTrip));
router.post("/trips/:id/location", requireAuth, requireRole("driver"), asyncHandler(pingDriverTripLocation));

module.exports = router;
