import { Request, Response, NextFunction } from 'express';
import { helpService } from './service';
import { z } from 'zod';
import { prisma } from '../common/utils/db';

// Validation Schemas
const categorySchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    icon: z.string().optional(),
    order: z.number().optional(),
    isAdminOnly: z.boolean().optional()
});

const articleSchema = z.object({
    title: z.string().min(1),
    slug: z.string().min(1),
    content: z.string().min(1),
    categoryId: z.string().uuid(),
    order: z.number().optional(),
    isPublished: z.boolean().optional(),
    isAdminOnly: z.boolean().optional()
});

const faqSchema = z.object({
    question: z.string().min(1),
    answer: z.string().min(1),
    order: z.number().optional(),
    isAdminOnly: z.boolean().optional()
});

const getIsAdmin = async (req: Request) => {
    if (!(req as any).user) return false;
    const userId = (req as any).user.userId;

    const user = await prisma.user.findUnique({
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

    if (!user?.role) return false;
    if (user.role.isSystem && user.role.name === 'SuperAdmin') return true;

    return user.role.permissions.some(rp => {
        const p = rp.permission;
        if (!p.resource) return false;
        const matchModule = p.resource.module.key === '*' || p.resource.module.key === 'help_center';
        const matchResource = p.resource.key === '*' || p.resource.key === 'management';
        const matchAction = p.action === '*' || p.action === 'ACCESS';
        return matchModule && matchResource && matchAction;
    });
};

export const helpController = {
    // Public Categories
    getCategories: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const isAdmin = await getIsAdmin(req);
            const categories = await helpService.getCategories(isAdmin);
            res.json({ success: true, data: categories });
        } catch (error) {
            next(error);
        }
    },

    // Public Articles
    getArticles: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const isAdmin = await getIsAdmin(req);
            const categoryId = req.query.categoryId as string | undefined;
            const search = req.query.search as string | undefined;
            const articles = await helpService.getArticles(categoryId, search, isAdmin);
            res.json({ success: true, data: articles });
        } catch (error) {
            next(error);
        }
    },

    getArticleBySlug: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const isAdmin = await getIsAdmin(req);
            const slug = req.params.slug as string;
            const userId = (req as any).user?.userId;
            const article = await helpService.getArticleBySlug(slug, isAdmin, userId);
            res.json({ success: true, data: article });
        } catch (error) {
            next(error);
        }
    },

    // Public FAQs
    getFaqs: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const isAdmin = await getIsAdmin(req);
            const faqs = await helpService.getFaqs(isAdmin);
            res.json({ success: true, data: faqs });
        } catch (error) {
            next(error);
        }
    },

    // Admin Categories
    createCategory: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = categorySchema.parse(req.body);
            const category = await helpService.createCategory(data);
            res.status(201).json({ success: true, data: category });
        } catch (error) {
            next(error);
        }
    },

    updateCategory: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            const data = categorySchema.partial().parse(req.body);
            const category = await helpService.updateCategory(id, data);
            res.json({ success: true, data: category });
        } catch (error) {
            next(error);
        }
    },

    deleteCategory: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            await helpService.deleteCategory(id);
            res.json({ success: true, message: 'Category deleted' });
        } catch (error) {
            next(error);
        }
    },

    // Admin Articles
    createArticle: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = articleSchema.parse(req.body);
            const article = await helpService.createArticle(data);
            res.status(201).json({ success: true, data: article });
        } catch (error) {
            next(error);
        }
    },

    updateArticle: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            const data = articleSchema.partial().parse(req.body);
            const article = await helpService.updateArticle(id, data);
            res.json({ success: true, data: article });
        } catch (error) {
            next(error);
        }
    },

    deleteArticle: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            await helpService.deleteArticle(id);
            res.json({ success: true, message: 'Article deleted' });
        } catch (error) {
            next(error);
        }
    },

    // Admin FAQs
    createFaq: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = faqSchema.parse(req.body);
            const faq = await helpService.createFaq(data);
            res.status(201).json({ success: true, data: faq });
        } catch (error) {
            next(error);
        }
    },

    updateFaq: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            const data = faqSchema.partial().parse(req.body);
            const faq = await helpService.updateFaq(id, data);
            res.json({ success: true, data: faq });
        } catch (error) {
            next(error);
        }
    },

    deleteFaq: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            await helpService.deleteFaq(id);
            res.json({ success: true, message: 'FAQ deleted' });
        } catch (error) {
            next(error);
        }
    },

    // voting
    voteArticle: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            const { isHelpful } = z.object({ isHelpful: z.boolean() }).parse(req.body);

            const userId = (req as any).user?.userId;
            if (!userId) {
                return res.status(401).json({ success: false, message: "Authentication required to vote" });
            }

            const article = await helpService.voteArticle(id, isHelpful, userId);
            res.json({ success: true, data: article });
        } catch (error) {
            next(error);
        }
    },

    // Seeding handler
    seedData: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await helpService.seedData();
            res.json(result);
        } catch (error) {
            next(error);
        }
    }
};
