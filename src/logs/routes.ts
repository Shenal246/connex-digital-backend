import { Router } from 'express';
import { requireAuth } from '../common/middlewares/auth';
import { requirePermission } from '../iam/middleware';
import { getLogs, getLogStats, getAdvancedAnalytics } from './controller';

const router = Router();

router.use(requireAuth);

router.get('/', requirePermission('audit', 'audit_logs', 'READ'), getLogs);
router.get('/stats', requirePermission('audit', 'audit_logs', 'READ'), getLogStats);
router.get('/analytics', requirePermission('audit', 'audit_logs', 'READ'), getAdvancedAnalytics);

export default router;
