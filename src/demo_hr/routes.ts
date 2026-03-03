import { Router } from 'express';
import { requireAuth } from '../common/middlewares/auth';
import { requirePermission } from '../iam/middleware';
import { listRequisitions, getRequisition, createRequisition } from './controller';
import { auditAction } from '../audit/middleware';

const router = Router();

router.use(requireAuth);

router.get('/manpower-requisitions', requirePermission('demo_hr', 'manpower_requisition', 'READ'), listRequisitions);
router.post('/manpower-requisitions',
    requirePermission('demo_hr', 'manpower_requisition', 'CREATE'),
    auditAction('REQUISITION_CREATE', 'ManpowerRequisition'),
    createRequisition
);
router.get('/manpower-requisitions/:id', requirePermission('demo_hr', 'manpower_requisition', 'READ'), getRequisition);

export default router;
