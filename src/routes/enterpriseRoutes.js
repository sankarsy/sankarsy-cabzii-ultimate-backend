const express = require("express");
const ctrl = require("../controllers/enterpriseCmsController");
const { asyncHandler } = require("../utils/asyncHandler");
const { optionalAuth, requireAuth, requireRole } = require("../middlewares/auth");

const router = express.Router();

router.get("/dashboard", requireAuth, requireRole("super_admin"), asyncHandler(ctrl.enterpriseDashboard));
router.post("/ai/draft", requireAuth, requireRole("super_admin"), asyncHandler(ctrl.generateAiDraft));
router.post("/bulk-import", requireAuth, requireRole("super_admin"), asyncHandler(ctrl.bulkImport));

router.get("/cms-pages", optionalAuth, asyncHandler(ctrl.listCmsPages));
router.get("/cms-pages/slug/:slug", optionalAuth, asyncHandler(ctrl.getCmsPageBySlug));
router.post("/cms-pages", requireAuth, requireRole("super_admin"), asyncHandler(ctrl.createCmsPage));
router.put("/cms-pages/:id", requireAuth, requireRole("super_admin"), asyncHandler(ctrl.updateCmsPage));
router.delete("/cms-pages/:id", requireAuth, requireRole("super_admin"), asyncHandler(ctrl.deleteCmsPage));

router.get("/faqs", optionalAuth, asyncHandler(ctrl.listFaqs));
router.post("/faqs", requireAuth, requireRole("super_admin"), asyncHandler(ctrl.createFaq));
router.put("/faqs/:id", requireAuth, requireRole("super_admin"), asyncHandler(ctrl.updateFaq));
router.delete("/faqs/:id", requireAuth, requireRole("super_admin"), asyncHandler(ctrl.deleteFaq));

router.get("/destinations", optionalAuth, asyncHandler(ctrl.listDestinations));
router.post("/destinations", requireAuth, requireRole("super_admin"), asyncHandler(ctrl.createDestination));
router.put("/destinations/:id", requireAuth, requireRole("super_admin"), asyncHandler(ctrl.updateDestination));
router.delete("/destinations/:id", requireAuth, requireRole("super_admin"), asyncHandler(ctrl.deleteDestination));

router.get("/media", requireAuth, requireRole("super_admin"), asyncHandler(ctrl.listMediaAssets));
router.post("/media", requireAuth, requireRole("super_admin"), asyncHandler(ctrl.createMediaAsset));
router.put("/media/:id", requireAuth, requireRole("super_admin"), asyncHandler(ctrl.updateMediaAsset));
router.delete("/media/:id", requireAuth, requireRole("super_admin"), asyncHandler(ctrl.deleteMediaAsset));

router.get("/seo-templates", requireAuth, requireRole("super_admin"), asyncHandler(ctrl.listSeoTemplates));
router.post("/seo-templates", requireAuth, requireRole("super_admin"), asyncHandler(ctrl.createSeoTemplate));
router.put("/seo-templates/:id", requireAuth, requireRole("super_admin"), asyncHandler(ctrl.updateSeoTemplate));
router.delete("/seo-templates/:id", requireAuth, requireRole("super_admin"), asyncHandler(ctrl.deleteSeoTemplate));
router.post("/seo-templates/preview", requireAuth, requireRole("super_admin"), asyncHandler(ctrl.renderSeoPreview));

router.get("/search-console", requireAuth, requireRole("super_admin"), asyncHandler(ctrl.listSearchConsole));
router.post("/search-console/import", requireAuth, requireRole("super_admin"), asyncHandler(ctrl.importSearchConsole));

router.get("/related-content", requireAuth, requireRole("super_admin"), asyncHandler(ctrl.listRelatedContent));
router.post("/related-content", requireAuth, requireRole("super_admin"), asyncHandler(ctrl.createRelatedContent));
router.put("/related-content/:id", requireAuth, requireRole("super_admin"), asyncHandler(ctrl.updateRelatedContent));
router.delete("/related-content/:id", requireAuth, requireRole("super_admin"), asyncHandler(ctrl.deleteRelatedContent));

router.get("/chat-leads", requireAuth, requireRole("super_admin"), asyncHandler(ctrl.listChatLeadsAdmin));
router.get("/audit-logs", requireAuth, requireRole("super_admin"), asyncHandler(ctrl.listAuditLogsAdmin));

module.exports = router;
