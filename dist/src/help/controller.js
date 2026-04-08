"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.helpController = void 0;
const service_1 = require("./service");
const zod_1 = require("zod");
const db_1 = require("../common/utils/db");
// Validation Schemas
const categorySchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    icon: zod_1.z.string().optional(),
    order: zod_1.z.number().optional(),
    isAdminOnly: zod_1.z.boolean().optional()
});
const articleSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    slug: zod_1.z.string().min(1),
    content: zod_1.z.string().min(1),
    categoryId: zod_1.z.string().uuid(),
    order: zod_1.z.number().optional(),
    isPublished: zod_1.z.boolean().optional(),
    isAdminOnly: zod_1.z.boolean().optional()
});
const faqSchema = zod_1.z.object({
    question: zod_1.z.string().min(1),
    answer: zod_1.z.string().min(1),
    order: zod_1.z.number().optional(),
    isAdminOnly: zod_1.z.boolean().optional()
});
const getIsAdmin = async (req) => {
    if (!req.user)
        return false;
    const userId = req.user.userId;
    const user = await db_1.prisma.user.findUnique({
        where: { id: userId },
        include: {
            role: {
                include: {
                    permissions: {
                        include: {
                            permission: {
                                include: {
                                    resource: {
                                        include: {
                                            module: true
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    });
    if (!user?.role)
        return false;
    if (user.role.isSystem && user.role.name === 'SuperAdmin')
        return true;
    return user.role.permissions.some(rp => {
        const p = rp.permission;
        if (!p.resource)
            return false;
        const matchModule = p.resource.module.key === '*' || p.resource.module.key === 'help_center';
        const matchResource = p.resource.key === '*' || p.resource.key === 'management';
        const matchAction = p.action === '*' || p.action === 'ACCESS';
        return matchModule && matchResource && matchAction;
    });
};
exports.helpController = {
    // Public Categories
    getCategories: async (req, res, next) => {
        try {
            const isAdmin = await getIsAdmin(req);
            const categories = await service_1.helpService.getCategories(isAdmin);
            res.json({ success: true, data: categories });
        }
        catch (error) {
            next(error);
        }
    },
    // Public Articles
    getArticles: async (req, res, next) => {
        try {
            const isAdmin = await getIsAdmin(req);
            const categoryId = req.query.categoryId;
            const search = req.query.search;
            const articles = await service_1.helpService.getArticles(categoryId, search, isAdmin);
            res.json({ success: true, data: articles });
        }
        catch (error) {
            next(error);
        }
    },
    getArticleBySlug: async (req, res, next) => {
        try {
            const isAdmin = await getIsAdmin(req);
            const slug = req.params.slug;
            const userId = req.user?.userId;
            const article = await service_1.helpService.getArticleBySlug(slug, isAdmin, userId);
            res.json({ success: true, data: article });
        }
        catch (error) {
            next(error);
        }
    },
    // Public FAQs
    getFaqs: async (req, res, next) => {
        try {
            const isAdmin = await getIsAdmin(req);
            const faqs = await service_1.helpService.getFaqs(isAdmin);
            res.json({ success: true, data: faqs });
        }
        catch (error) {
            next(error);
        }
    },
    // Admin Categories
    createCategory: async (req, res, next) => {
        try {
            const data = categorySchema.parse(req.body);
            const category = await service_1.helpService.createCategory(data);
            res.status(201).json({ success: true, data: category });
        }
        catch (error) {
            next(error);
        }
    },
    updateCategory: async (req, res, next) => {
        try {
            const id = req.params.id;
            const data = categorySchema.partial().parse(req.body);
            const category = await service_1.helpService.updateCategory(id, data);
            res.json({ success: true, data: category });
        }
        catch (error) {
            next(error);
        }
    },
    deleteCategory: async (req, res, next) => {
        try {
            const id = req.params.id;
            await service_1.helpService.deleteCategory(id);
            res.json({ success: true, message: 'Category deleted' });
        }
        catch (error) {
            next(error);
        }
    },
    // Admin Articles
    createArticle: async (req, res, next) => {
        try {
            const data = articleSchema.parse(req.body);
            const article = await service_1.helpService.createArticle(data);
            res.status(201).json({ success: true, data: article });
        }
        catch (error) {
            next(error);
        }
    },
    updateArticle: async (req, res, next) => {
        try {
            const id = req.params.id;
            const data = articleSchema.partial().parse(req.body);
            const article = await service_1.helpService.updateArticle(id, data);
            res.json({ success: true, data: article });
        }
        catch (error) {
            next(error);
        }
    },
    deleteArticle: async (req, res, next) => {
        try {
            const id = req.params.id;
            await service_1.helpService.deleteArticle(id);
            res.json({ success: true, message: 'Article deleted' });
        }
        catch (error) {
            next(error);
        }
    },
    // Admin FAQs
    createFaq: async (req, res, next) => {
        try {
            const data = faqSchema.parse(req.body);
            const faq = await service_1.helpService.createFaq(data);
            res.status(201).json({ success: true, data: faq });
        }
        catch (error) {
            next(error);
        }
    },
    updateFaq: async (req, res, next) => {
        try {
            const id = req.params.id;
            const data = faqSchema.partial().parse(req.body);
            const faq = await service_1.helpService.updateFaq(id, data);
            res.json({ success: true, data: faq });
        }
        catch (error) {
            next(error);
        }
    },
    deleteFaq: async (req, res, next) => {
        try {
            const id = req.params.id;
            await service_1.helpService.deleteFaq(id);
            res.json({ success: true, message: 'FAQ deleted' });
        }
        catch (error) {
            next(error);
        }
    },
    // voting
    voteArticle: async (req, res, next) => {
        try {
            const id = req.params.id;
            const { isHelpful } = zod_1.z.object({ isHelpful: zod_1.z.boolean() }).parse(req.body);
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ success: false, message: "Authentication required to vote" });
            }
            const article = await service_1.helpService.voteArticle(id, isHelpful, userId);
            res.json({ success: true, data: article });
        }
        catch (error) {
            next(error);
        }
    },
    // Seeding handler
    seedData: async (req, res, next) => {
        try {
            const result = await service_1.helpService.seedData();
            res.json(result);
        }
        catch (error) {
            next(error);
        }
    }
};
