"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.helpService = exports.HelpService = void 0;
const db_1 = require("../common/utils/db");
const errorHandler_1 = require("../common/middlewares/errorHandler");
class HelpService {
    // Categories
    async getCategories(isAdmin = false) {
        return db_1.prisma.helpCategory.findMany({
            where: {
                ...(isAdmin ? {} : { isAdminOnly: false })
            },
            orderBy: { order: 'asc' },
            include: {
                _count: {
                    select: {
                        articles: {
                            where: {
                                isPublished: true,
                                ...(isAdmin ? {} : { isAdminOnly: false })
                            }
                        }
                    }
                }
            }
        });
    }
    async createCategory(data) {
        return db_1.prisma.helpCategory.create({ data });
    }
    async updateCategory(id, data) {
        return db_1.prisma.helpCategory.update({
            where: { id },
            data
        });
    }
    async deleteCategory(id) {
        return db_1.prisma.helpCategory.delete({ where: { id } });
    }
    // Articles
    async getArticles(categoryId, search, isAdmin = false) {
        return db_1.prisma.helpArticle.findMany({
            where: {
                isPublished: true,
                ...(isAdmin ? {} : { isAdminOnly: false }),
                ...(categoryId && { categoryId }),
                ...(search && {
                    OR: [
                        { title: { contains: search, mode: 'insensitive' } },
                        { content: { contains: search, mode: 'insensitive' } }
                    ]
                })
            },
            include: { category: true },
            orderBy: { order: 'asc' }
        });
    }
    async getArticleBySlug(slug, isAdmin = false, userId) {
        const article = await db_1.prisma.helpArticle.findFirst({
            where: {
                slug,
                isPublished: true,
                ...(isAdmin ? {} : { isAdminOnly: false })
            },
            include: {
                category: true,
                ...(userId && {
                    votes: {
                        where: { userId },
                        take: 1
                    }
                })
            }
        });
        if (!article)
            throw new errorHandler_1.AppError(404, 'Article not found');
        // Transform if userId provided
        if (userId) {
            const userVote = article.votes?.[0]?.isHelpful ?? null;
            const { votes, ...rest } = article;
            return { ...rest, userVote };
        }
        return article;
    }
    async createArticle(data) {
        return db_1.prisma.helpArticle.create({ data });
    }
    async updateArticle(id, data) {
        return db_1.prisma.helpArticle.update({
            where: { id },
            data
        });
    }
    async deleteArticle(id) {
        return db_1.prisma.helpArticle.delete({ where: { id } });
    }
    // FAQs
    async getFaqs(isAdmin = false, search) {
        return db_1.prisma.fAQ.findMany({
            where: {
                ...(isAdmin ? {} : { isAdminOnly: false }),
                ...(search && {
                    OR: [
                        { question: { contains: search, mode: 'insensitive' } },
                        { answer: { contains: search, mode: 'insensitive' } }
                    ]
                })
            },
            orderBy: { order: 'asc' }
        });
    }
    async createFaq(data) {
        return db_1.prisma.fAQ.create({ data });
    }
    async updateFaq(id, data) {
        return db_1.prisma.fAQ.update({
            where: { id },
            data
        });
    }
    async deleteFaq(id) {
        return db_1.prisma.fAQ.delete({ where: { id } });
    }
    // Helpfulness Voting
    async voteArticle(articleId, isHelpful, userId) {
        return db_1.prisma.$transaction(async (tx) => {
            // Check for existing vote
            const existingVote = await tx.helpArticleVote.findUnique({
                where: {
                    articleId_userId: { articleId, userId }
                }
            });
            if (existingVote) {
                // If the vote is the same, no need to update
                if (existingVote.isHelpful === isHelpful)
                    return;
                // Update vote and adjust counts
                await tx.helpArticleVote.update({
                    where: { id: existingVote.id },
                    data: { isHelpful }
                });
                await tx.helpArticle.update({
                    where: { id: articleId },
                    data: {
                        helpfulCount: isHelpful ? { increment: 1 } : { decrement: 1 },
                        notHelpfulCount: isHelpful ? { decrement: 1 } : { increment: 1 }
                    }
                });
            }
            else {
                // New vote
                await tx.helpArticleVote.create({
                    data: { articleId, userId, isHelpful }
                });
                await tx.helpArticle.update({
                    where: { id: articleId },
                    data: {
                        [isHelpful ? 'helpfulCount' : 'notHelpfulCount']: {
                            increment: 1
                        }
                    }
                });
            }
        });
    }
    // Seeding Tool
    async seedData() {
        console.log('Bulk seeding Help Center content...');
        return await db_1.prisma.$transaction(async (tx) => {
            const categories = [
                { name: 'Onboarding', description: 'Internal guides for new employees and administrators.', icon: 'UserPlus', isAdminOnly: true, order: 1 },
                { name: 'Public Knowledge Base', description: 'General information for all users.', icon: 'BookOpen', isAdminOnly: false, order: 2 }
            ];
            for (const cat of categories) {
                await tx.helpCategory.upsert({
                    where: { name: cat.name },
                    update: cat,
                    create: cat
                });
            }
            const allCats = await tx.helpCategory.findMany();
            const internal = allCats.find(c => c.name === 'Onboarding');
            const publicCat = allCats.find(c => c.name === 'Public Knowledge Base');
            const articles = [
                {
                    title: 'System Administration Overview',
                    slug: 'admin-overview',
                    content: 'This article is for administrators only. It explains how to manage user accounts and platform settings.',
                    categoryId: internal.id,
                    isAdminOnly: true,
                    isPublished: true,
                    order: 1
                },
                {
                    title: 'Getting Started for Users',
                    slug: 'user-getting-started',
                    content: 'Welcome to the platform! This guide helps you set up your basic preferences.',
                    categoryId: publicCat.id,
                    isAdminOnly: false,
                    isPublished: true,
                    order: 1
                }
            ];
            for (const art of articles) {
                await tx.helpArticle.upsert({
                    where: { slug: art.slug },
                    update: art,
                    create: art
                });
            }
            return { status: 'success', message: 'Help center content seeded successfully' };
        });
    }
}
exports.HelpService = HelpService;
exports.helpService = new HelpService();
