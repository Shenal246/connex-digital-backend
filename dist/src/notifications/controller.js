"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNotification = exports.markAllAsRead = exports.markAsRead = exports.getUnreadCount = exports.getNotifications = void 0;
const service_1 = require("./service");
const getNotifications = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        if (!userId)
            return res.status(401).json({ message: 'Unauthorized' });
        const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit) : 50;
        const offset = typeof req.query.offset === 'string' ? parseInt(req.query.offset) : 0;
        const notifications = await service_1.NotificationService.getNotifications(userId, limit, offset);
        res.status(200).json(notifications);
    }
    catch (error) {
        next(error);
    }
};
exports.getNotifications = getNotifications;
const getUnreadCount = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        if (!userId)
            return res.status(401).json({ message: 'Unauthorized' });
        const count = await service_1.NotificationService.getUnreadCount(userId);
        res.status(200).json({ count });
    }
    catch (error) {
        next(error);
    }
};
exports.getUnreadCount = getUnreadCount;
const markAsRead = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        const id = req.params.id;
        if (!userId)
            return res.status(401).json({ message: 'Unauthorized' });
        await service_1.NotificationService.markAsRead(id, userId);
        res.status(200).json({ message: 'Marked as read' });
    }
    catch (error) {
        next(error);
    }
};
exports.markAsRead = markAsRead;
const markAllAsRead = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        if (!userId)
            return res.status(401).json({ message: 'Unauthorized' });
        await service_1.NotificationService.markAllAsRead(userId);
        res.status(200).json({ message: 'All marked as read' });
    }
    catch (error) {
        next(error);
    }
};
exports.markAllAsRead = markAllAsRead;
// Admin/System endpoint
const createNotification = async (req, res, next) => {
    try {
        const { userId: targetUserId, title, message, type, linkUrl } = req.body;
        const notification = await service_1.NotificationService.createNotification({
            userId: targetUserId,
            title,
            message,
            type,
            linkUrl,
        });
        res.status(201).json(notification);
    }
    catch (error) {
        next(error);
    }
};
exports.createNotification = createNotification;
