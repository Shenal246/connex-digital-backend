"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.workflowService = exports.WorkflowService = void 0;
const db_1 = require("../common/utils/db");
const errorHandler_1 = require("../common/middlewares/errorHandler");
const logger_1 = require("../common/utils/logger");
class WorkflowService {
    async createDraft(triggerEvent, definitionJson) {
        const workflowId = crypto.randomUUID();
        return await db_1.prisma.workflowDefinition.create({
            data: {
                workflowId,
                version: 1,
                status: 'DRAFT',
                triggerEvent,
                definitionJson,
            },
        });
    }
    async getDefinitions() {
        return await db_1.prisma.workflowDefinition.findMany({
            orderBy: [{ workflowId: 'asc' }, { version: 'desc' }],
        });
    }
    async publishWorkflow(id) {
        const draft = await db_1.prisma.workflowDefinition.findUnique({ where: { id } });
        if (!draft)
            throw new errorHandler_1.AppError(404, 'Workflow not found');
        if (draft.status === 'PUBLISHED')
            throw new errorHandler_1.AppError(400, 'Already published');
        // Archive previous published version of the same workflowId
        await db_1.prisma.workflowDefinition.updateMany({
            where: { workflowId: draft.workflowId, status: 'PUBLISHED' },
            data: { status: 'ARCHIVED' },
        });
        return await db_1.prisma.workflowDefinition.update({
            where: { id },
            data: { status: 'PUBLISHED' },
        });
    }
    // Runtime
    async triggerEvent(eventName, entityId, context) {
        const publishedDef = await db_1.prisma.workflowDefinition.findFirst({
            where: { triggerEvent: eventName, status: 'PUBLISHED' },
            orderBy: { version: 'desc' },
        });
        if (!publishedDef) {
            logger_1.logger.info(`No active workflow for event ${eventName}`);
            return null;
        }
        const instance = await db_1.prisma.workflowInstance.create({
            data: {
                workflowDefId: publishedDef.id,
                triggerEntityId: entityId,
                status: 'PENDING',
                contextJson: context,
            },
        });
        await this.evaluateNextSteps(instance.id, publishedDef.definitionJson);
        return instance;
    }
    async evaluateNextSteps(instanceId, defJson) {
        // A real engine would traverse the React Flow JSON nodes and edges.
        // For this boilerplate, we'll find the first "ApprovalStep" or "ParallelApprovalStep" and create tasks.
        const nodes = defJson.nodes || [];
        // Just find the first approval node for demonstration
        const approvalNode = nodes.find((n) => n.type === 'ApprovalStep');
        if (approvalNode) {
            const { assignedToRoleId, assignedToUserId, slaDays } = approvalNode.data;
            const slaDueDate = new Date();
            if (slaDays)
                slaDueDate.setDate(slaDueDate.getDate() + parseInt(slaDays));
            await db_1.prisma.approvalTask.create({
                data: {
                    instanceId,
                    stepNodeId: approvalNode.id,
                    assignedToRoleId: assignedToRoleId || null,
                    assignedToUserId: assignedToUserId || null,
                    slaDueDate,
                    status: 'PENDING',
                },
            });
        }
        else {
            // If no approval step, just complete it
            await db_1.prisma.workflowInstance.update({
                where: { id: instanceId },
                data: { status: 'COMPLETED' },
            });
        }
    }
    async getMyTasks(userId) {
        // Get tasks assigned specifically to the user OR a role the user has
        const user = await db_1.prisma.user.findUnique({
            where: { id: userId },
            select: { roleId: true },
        });
        const roleId = user?.roleId;
        return await db_1.prisma.approvalTask.findMany({
            where: {
                status: 'PENDING',
                OR: [
                    { assignedToUserId: userId },
                    ...(roleId ? [{ assignedToRoleId: roleId }] : []),
                ],
            },
            include: { instance: true },
        });
    }
    async actionTask(taskId, userId, action, comments) {
        const task = await db_1.prisma.approvalTask.findUnique({ where: { id: taskId } });
        if (!task || task.status !== 'PENDING')
            throw new errorHandler_1.AppError(400, 'Invalid task');
        let newTaskStatus = 'APPROVED';
        if (action === 'REJECT')
            newTaskStatus = 'REJECTED';
        if (action === 'AMEND')
            newTaskStatus = 'AMEND_REQUIRED';
        await db_1.prisma.approvalTask.update({
            where: { id: taskId },
            data: { status: newTaskStatus, comments },
        });
        // In a full engine, we'd check if all parallel tasks are done, then move to next node.
        // Here we just update the instance status for simplicity.
        await db_1.prisma.workflowInstance.update({
            where: { id: task.instanceId },
            data: { status: newTaskStatus === 'APPROVED' ? 'COMPLETED' : newTaskStatus },
        });
        return { success: true };
    }
}
exports.WorkflowService = WorkflowService;
exports.workflowService = new WorkflowService();
