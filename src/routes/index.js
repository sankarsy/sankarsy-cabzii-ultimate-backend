const express = require("express");
const authRoutes = require("./authRoutes");
const cabRoutes = require("./cabRoutes");
const packageRoutes = require("./packageRoutes");
const driverRoutes = require("./driverRoutes");
const bookingRoutes = require("./bookingRoutes");
const auditRoutes = require("./auditRoutes");
const uploadRoutes = require("./uploadRoutes");
const vendorRoutes = require("./vendorRoutes");
const cityRoutes = require("./cityRoutes");
const locationRoutes = require("./locationRoutes");
const blogRoutes = require("./blogRoutes");
const testimonialRoutes = require("./testimonialRoutes");
const siteSettingsRoutes = require("./siteSettingsRoutes");
const userRoutes = require("./userRoutes");
const analyticsRoutes = require("./analyticsRoutes");

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({ success: true, message: "Backend is healthy" });
});

router.use("/auth", authRoutes);
router.use("/cabs", cabRoutes);
router.use("/packages", packageRoutes);
router.use("/drivers", driverRoutes);
router.use("/bookings", bookingRoutes);
router.use("/audit-logs", auditRoutes);
router.use("/upload", uploadRoutes);
router.use("/vendors", vendorRoutes);
router.use("/cities", cityRoutes);
router.use("/locations", locationRoutes);
router.use("/blogs", blogRoutes);
router.use("/testimonials", testimonialRoutes);
router.use("/site-settings", siteSettingsRoutes);
router.use("/users", userRoutes);
router.use("/analytics", analyticsRoutes);

module.exports = router;
