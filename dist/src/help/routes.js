"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controller_1 = require("./controller");
const auth_1 = require("../common/middlewares/auth");
const middleware_1 = require("../iam/middleware");
const router = (0, express_1.Router)();
// Public routes (using optionalAuth to detect admin role if logged in)
router.get('/categories', auth_1.optionalAuth, controller_1.helpController.getCategories);
router.get('/articles', auth_1.optionalAuth, controller_1.helpController.getArticles);
router.get('/articles/:slug', auth_1.optionalAuth, controller_1.helpController.getArticleBySlug);
router.get('/faqs', auth_1.optionalAuth, controller_1.helpController.getFaqs);
// Authenticated routes
router.use(auth_1.requireAuth);
router.post('/articles/:id/vote', controller_1.helpController.voteArticle);
const MODULE = 'help_center';
// Categories Admin
router.post('/categories', (0, middleware_1.requirePermission)(MODULE, 'management', 'ACCESS'), controller_1.helpController.createCategory);
router.patch('/categories/:id', (0, middleware_1.requirePermission)(MODULE, 'management', 'ACCESS'), controller_1.helpController.updateCategory);
router.delete('/categories/:id', (0, middleware_1.requirePermission)(MODULE, 'management', 'ACCESS'), controller_1.helpController.deleteCategory);
// Articles Admin
router.post('/articles', (0, middleware_1.requirePermission)(MODULE, 'management', 'ACCESS'), controller_1.helpController.createArticle);
router.patch('/articles/:id', (0, middleware_1.requirePermission)(MODULE, 'management', 'ACCESS'), controller_1.helpController.updateArticle);
router.delete('/articles/:id', (0, middleware_1.requirePermission)(MODULE, 'management', 'ACCESS'), controller_1.helpController.deleteArticle);
// FAQs Admin
router.post('/faqs', (0, middleware_1.requirePermission)(MODULE, 'management', 'ACCESS'), controller_1.helpController.createFaq);
router.patch('/faqs/:id', (0, middleware_1.requirePermission)(MODULE, 'management', 'ACCESS'), controller_1.helpController.updateFaq);
router.delete('/faqs/:id', (0, middleware_1.requirePermission)(MODULE, 'management', 'ACCESS'), controller_1.helpController.deleteFaq);
// Seeding
router.post('/seed', (0, middleware_1.requirePermission)(MODULE, 'management', 'ACCESS'), controller_1.helpController.seedData);
exports.default = router;
