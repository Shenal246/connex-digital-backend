import { Router } from 'express';
import { helpController } from './controller';
import { requireAuth, optionalAuth } from '../common/middlewares/auth';
import { requirePermission } from '../iam/middleware';

const router = Router();

// Public routes (using optionalAuth to detect admin role if logged in)
router.get('/categories', optionalAuth, helpController.getCategories);
router.get('/articles', optionalAuth, helpController.getArticles);
router.get('/articles/:slug', optionalAuth, helpController.getArticleBySlug);
router.get('/faqs', optionalAuth, helpController.getFaqs);

// Authenticated routes
router.use(requireAuth);
router.post('/articles/:id/vote', helpController.voteArticle);

const MODULE = 'help_center';

// Categories Admin
router.post('/categories', requirePermission(MODULE, 'management', 'ACCESS'), helpController.createCategory);
router.patch('/categories/:id', requirePermission(MODULE, 'management', 'ACCESS'), helpController.updateCategory);
router.delete('/categories/:id', requirePermission(MODULE, 'management', 'ACCESS'), helpController.deleteCategory);

// Articles Admin
router.post('/articles', requirePermission(MODULE, 'management', 'ACCESS'), helpController.createArticle);
router.patch('/articles/:id', requirePermission(MODULE, 'management', 'ACCESS'), helpController.updateArticle);
router.delete('/articles/:id', requirePermission(MODULE, 'management', 'ACCESS'), helpController.deleteArticle);

// FAQs Admin
router.post('/faqs', requirePermission(MODULE, 'management', 'ACCESS'), helpController.createFaq);
router.patch('/faqs/:id', requirePermission(MODULE, 'management', 'ACCESS'), helpController.updateFaq);
router.delete('/faqs/:id', requirePermission(MODULE, 'management', 'ACCESS'), helpController.deleteFaq);

// Seeding
router.post('/seed', requirePermission(MODULE, 'management', 'ACCESS'), helpController.seedData);

export default router;
