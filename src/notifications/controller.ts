import { Request, Response, NextFunction } from 'express';
import { NotificationService } from './service';

export const getNotifications = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit) : 50;
        const offset = typeof req.query.offset === 'string' ? parseInt(req.query.offset) : 0;

        const notifications = await NotificationService.getNotifications(userId, limit, offset);
        res.status(200).json(notifications);
    } catch (error) {
        next(error);
    }
};

export const getUnreadCount = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const count = await NotificationService.getUnreadCount(userId);
        res.status(200).json({ count });
    } catch (error) {
        next(error);
    }
};

export const markAsRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId;
        const id = req.params.id as string;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        await NotificationService.markAsRead(id, userId);
        res.status(200).json({ message: 'Marked as read' });
    } catch (error) {
        next(error);
    }
};

export const markAllAsRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        await NotificationService.markAllAsRead(userId);
        res.status(200).json({ message: 'All marked as read' });
    } catch (error) {
        next(error);
    }
};

// Admin/System endpoint
export const createNotification = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { userId: targetUserId, title, message, type, linkUrl } = req.body;
        const notification = await NotificationService.createNotification({
            userId: targetUserId,
            title,
            message,
            type,
            linkUrl,
        });
        res.status(201).json(notification);
    } catch (error) {
        next(error);
    }
};
