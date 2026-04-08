import { Router } from 'express';
import { requireAuth } from '../common/middlewares/auth';
import { requirePermission } from '../iam/middleware';
import * as controller from './controller';
import { auditAction } from '../audit/middleware';

const router = Router();

const MODULE = 'notifications';
const RESOURCE = 'general';

router.use(requireAuth);

router.get('/', requirePermission(MODULE, RESOURCE, 'READ'), controller.getNotifications);
router.get('/unread-count', requirePermission(MODULE, RESOURCE, 'READ'), controller.getUnreadCount);
router.patch('/read-all', auditAction('NOTIFICATION_READ_ALL', 'Notification'), controller.markAllAsRead);
router.patch('/:id/read', auditAction('NOTIFICATION_READ', 'Notification'), controller.markAsRead);
router.post('/', requirePermission(MODULE, RESOURCE, 'SEND'), auditAction('NOTIFICATION_SEND', 'Notification'), controller.createNotification);

export default router;
