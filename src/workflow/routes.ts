import { Router } from 'express';
import { requireAuth } from '../common/middlewares/auth';
import { requirePermission } from '../iam/middleware';
import { auditAction } from '../audit/middleware';
import {
    createDraft,
    getDefinitions,
    MathPublishWorkflow,
    getMyTasks,
    actionTask,
} from './controller';

const router = Router();

router.use(requireAuth);

// Definitions CRUD
router.post('/definitions', requirePermission('workflow', 'workflow_definition', 'CREATE'), auditAction('WORKFLOW_DRAFT_CREATE', 'WorkflowDefinition'), createDraft);
router.get('/definitions', requirePermission('workflow', 'workflow_definition', 'READ'), getDefinitions);
router.post('/definitions/:id/publish', requirePermission('workflow', 'workflow_definition', 'UPDATE'), auditAction('WORKFLOW_PUBLISH', 'WorkflowDefinition'), MathPublishWorkflow);

// Runtime Inbox & Actions
router.get('/tasks', requirePermission('workflow', 'approval_task', 'READ'), getMyTasks);
router.post('/tasks/:id/action', requirePermission('workflow', 'approval_task', 'APPROVE'), auditAction('WORKFLOW_TASK_ACTION', 'ApprovalTask'), actionTask);

export default router;
