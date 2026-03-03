import { prisma } from '../common/utils/db';
import { AppError } from '../common/middlewares/errorHandler';

export class HelpService {
    // Categories
    async getCategories(isAdmin = false) {
        return prisma.helpCategory.findMany({
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

    async createCategory(data: { name: string; description?: string; icon?: string; order?: number; isAdminOnly?: boolean }) {
        return prisma.helpCategory.create({ data });
    }

    async updateCategory(id: string, data: { name?: string; description?: string; icon?: string; order?: number; isAdminOnly?: boolean }) {
        return prisma.helpCategory.update({
            where: { id },
            data
        });
    }

    async deleteCategory(id: string) {
        return prisma.helpCategory.delete({ where: { id } });
    }

    // Articles
    async getArticles(categoryId?: string, search?: string, isAdmin = false) {
        return prisma.helpArticle.findMany({
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

    async getArticleBySlug(slug: string, isAdmin = false, userId?: string) {
        const article = await prisma.helpArticle.findFirst({
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

        if (!article) throw new AppError(404, 'Article not found');

        // Transform if userId provided
        if (userId) {
            const userVote = (article as any).votes?.[0]?.isHelpful ?? null;
            const { votes, ...rest } = article as any;
            return { ...rest, userVote };
        }

        return article;
    }

    async createArticle(data: { title: string; slug: string; content: string; categoryId: string; order?: number; isPublished?: boolean; isAdminOnly?: boolean }) {
        return prisma.helpArticle.create({ data });
    }

    async updateArticle(id: string, data: { title?: string; slug?: string; content?: string; categoryId?: string; order?: number; isPublished?: boolean; isAdminOnly?: boolean }) {
        return prisma.helpArticle.update({
            where: { id },
            data
        });
    }

    async deleteArticle(id: string) {
        return prisma.helpArticle.delete({ where: { id } });
    }

    // FAQs
    async getFaqs(isAdmin = false, search?: string) {
        return prisma.fAQ.findMany({
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

    async createFaq(data: { question: string; answer: string; order?: number; isAdminOnly?: boolean }) {
        return prisma.fAQ.create({ data });
    }

    async updateFaq(id: string, data: { question?: string; answer?: string; order?: number; isAdminOnly?: boolean }) {
        return prisma.fAQ.update({
            where: { id },
            data
        });
    }

    async deleteFaq(id: string) {
        return prisma.fAQ.delete({ where: { id } });
    }

    // Helpfulness Voting
    async voteArticle(articleId: string, isHelpful: boolean, userId: string) {
        return prisma.$transaction(async (tx) => {
            // Check for existing vote
            const existingVote = await tx.helpArticleVote.findUnique({
                where: {
                    articleId_userId: { articleId, userId }
                }
            });

            if (existingVote) {
                // If the vote is the same, no need to update
                if (existingVote.isHelpful === isHelpful) return;

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
            } else {
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

        return await prisma.$transaction(async (tx) => {
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
                    categoryId: internal!.id,
                    isAdminOnly: true,
                    isPublished: true,
                    order: 1
                },
                {
                    title: 'Getting Started for Users',
                    slug: 'user-getting-started',
                    content: 'Welcome to the platform! This guide helps you set up your basic preferences.',
                    categoryId: publicCat!.id,
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

export const helpService = new HelpService();
