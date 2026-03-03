"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
exports.NotificationService = {
    async getNotifications(userId, limit = 50, offset = 0) {
        return prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
        });
    },
    async getUnreadCount(userId) {
        return prisma.notification.count({
            where: { userId, isRead: false },
        });
    },
    async markAsRead(id, userId) {
        return prisma.notification.updateMany({
            where: { id, userId },
            data: { isRead: true },
        });
    },
    async markAllAsRead(userId) {
        return prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true },
        });
    },
    async createNotification(data) {
        return prisma.notification.create({
            data,
        });
    },
};
