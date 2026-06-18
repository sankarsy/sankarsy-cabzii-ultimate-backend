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
const reviewRoutes = require("./reviewRoutes");
const siteSettingsRoutes = require("./siteSettingsRoutes");
const analyticsRoutes = require("./analyticsRoutes");
const userRoutes = require("./userRoutes");
const seoServiceRoutes = require("./seoServiceRoutes");
const seoRouteRoutes = require("./seoRouteRoutes");
const seoCityPageRoutes = require("./seoCityPageRoutes");
const seoMenuRoutes = require("./seoMenuRoutes");
const chatLeadRoutes = require("./chatLeadRoutes");
const crmRoutes = require("./crmRoutes");
const enterpriseRoutes = require("./enterpriseRoutes");

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
router.use("/reviews", reviewRoutes);
router.use("/site-settings", siteSettingsRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/users", userRoutes);
router.use("/seo-services", seoServiceRoutes);
router.use("/seo-routes", seoRouteRoutes);
router.use("/seo-city-pages", seoCityPageRoutes);
router.use("/seo-menu", seoMenuRoutes);
router.use("/chat-leads", chatLeadRoutes);
router.use("/crm", crmRoutes);
router.use("/enterprise", enterpriseRoutes);

module.exports = router;
