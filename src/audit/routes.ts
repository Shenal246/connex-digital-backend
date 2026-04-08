import { Router } from 'express';
import { requireAuth } from '../common/middlewares/auth';
import { requirePermission } from '../iam/middleware';

const router = Router();

// Secure all audit routes
router.use(requireAuth);

router.get('/', requirePermission('audit', 'audit_logs', 'READ'), (req, res) => {
    res.json({ module: 'audit' });
});

export default router;
