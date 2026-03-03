import { Router } from 'express';
import { requireAuth } from '../common/middlewares/auth';
import * as controller from './controller';
import { auditAction } from '../audit/middleware';

const router = Router();

router.use(requireAuth);

router.get('/', controller.getNotifications);
router.get('/unread-count', controller.getUnreadCount);
router.patch('/read-all', auditAction('NOTIFICATION_READ_ALL', 'Notification'), controller.markAllAsRead);
router.patch('/:id/read', auditAction('NOTIFICATION_READ', 'Notification'), controller.markAsRead);
router.post('/', auditAction('NOTIFICATION_SEND', 'Notification'), controller.createNotification);

export default router;
