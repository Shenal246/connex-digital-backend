import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const NotificationService = {
    async getNotifications(userId: string, limit = 50, offset = 0) {
        return prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
        });
    },

    async getUnreadCount(userId: string) {
        return prisma.notification.count({
            where: { userId, isRead: false },
        });
    },

    async markAsRead(id: string, userId: string) {
        return prisma.notification.updateMany({
            where: { id, userId },
            data: { isRead: true },
        });
    },

    async markAllAsRead(userId: string) {
        return prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true },
        });
    },

    async createNotification(data: {
        userId: string;
        title: string;
        message: string;
        type?: string;
        linkUrl?: string;
    }) {
        return prisma.notification.create({
            data,
        });
    },
};
