"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../common/middlewares/auth");
const middleware_1 = require("../iam/middleware");
const middleware_2 = require("../audit/middleware");
const controller_1 = require("./controller");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth);
// Definitions CRUD
router.post('/definitions', (0, middleware_1.requirePermission)('workflow', 'workflow_definition', 'CREATE'), (0, middleware_2.auditAction)('WORKFLOW_DRAFT_CREATE', 'WorkflowDefinition'), controller_1.createDraft);
router.get('/definitions', (0, middleware_1.requirePermission)('workflow', 'workflow_definition', 'READ'), controller_1.getDefinitions);
router.post('/definitions/:id/publish', (0, middleware_1.requirePermission)('workflow', 'workflow_definition', 'UPDATE'), (0, middleware_2.auditAction)('WORKFLOW_PUBLISH', 'WorkflowDefinition'), controller_1.MathPublishWorkflow);
// Runtime Inbox & Actions
router.get('/tasks', (0, middleware_1.requirePermission)('workflow', 'approval_task', 'READ'), controller_1.getMyTasks);
router.post('/tasks/:id/action', (0, middleware_1.requirePermission)('workflow', 'approval_task', 'APPROVE'), (0, middleware_2.auditAction)('WORKFLOW_TASK_ACTION', 'ApprovalTask'), controller_1.actionTask);
exports.default = router;
