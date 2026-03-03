import { prisma } from '../common/utils/db';
import { AppError } from '../common/middlewares/errorHandler';
import { logger } from '../common/utils/logger';
import { Prisma } from '@prisma/client';

export class WorkflowService {
    async createDraft(triggerEvent: string, definitionJson: any) {
        const workflowId = crypto.randomUUID();
        return await prisma.workflowDefinition.create({
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
        return await prisma.workflowDefinition.findMany({
            orderBy: [{ workflowId: 'asc' }, { version: 'desc' }],
        });
    }

    async publishWorkflow(id: string) {
        const draft = await prisma.workflowDefinition.findUnique({ where: { id } });
        if (!draft) throw new AppError(404, 'Workflow not found');
        if (draft.status === 'PUBLISHED') throw new AppError(400, 'Already published');

        // Archive previous published version of the same workflowId
        await prisma.workflowDefinition.updateMany({
            where: { workflowId: draft.workflowId, status: 'PUBLISHED' },
            data: { status: 'ARCHIVED' },
        });

        return await prisma.workflowDefinition.update({
            where: { id },
            data: { status: 'PUBLISHED' },
        });
    }

    // Runtime
    async triggerEvent(eventName: string, entityId: string, context: any) {
        const publishedDef = await prisma.workflowDefinition.findFirst({
            where: { triggerEvent: eventName, status: 'PUBLISHED' },
            orderBy: { version: 'desc' },
        });

        if (!publishedDef) {
            logger.info(`No active workflow for event ${eventName}`);
            return null;
        }

        const instance = await prisma.workflowInstance.create({
            data: {
                workflowDefId: publishedDef.id,
                triggerEntityId: entityId,
                status: 'PENDING',
                contextJson: context,
            },
        });

        await this.evaluateNextSteps(instance.id, publishedDef.definitionJson as any);
        return instance;
    }

    private async evaluateNextSteps(instanceId: string, defJson: any) {
        // A real engine would traverse the React Flow JSON nodes and edges.
        // For this boilerplate, we'll find the first "ApprovalStep" or "ParallelApprovalStep" and create tasks.
        const nodes = defJson.nodes || [];
        // Just find the first approval node for demonstration
        const approvalNode = nodes.find((n: any) => n.type === 'ApprovalStep');

        if (approvalNode) {
            const { assignedToRoleId, assignedToUserId, slaDays } = approvalNode.data;

            const slaDueDate = new Date();
            if (slaDays) slaDueDate.setDate(slaDueDate.getDate() + parseInt(slaDays));

            await prisma.approvalTask.create({
                data: {
                    instanceId,
                    stepNodeId: approvalNode.id,
                    assignedToRoleId: assignedToRoleId || null,
                    assignedToUserId: assignedToUserId || null,
                    slaDueDate,
                    status: 'PENDING',
                },
            });
        } else {
            // If no approval step, just complete it
            await prisma.workflowInstance.update({
                where: { id: instanceId },
                data: { status: 'COMPLETED' },
            });
        }
    }

    async getMyTasks(userId: string) {
        // Get tasks assigned specifically to the user OR a role the user has
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { roleId: true },
        });

        const roleId = user?.roleId;

        return await prisma.approvalTask.findMany({
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

    async actionTask(taskId: string, userId: string, action: 'APPROVE' | 'REJECT' | 'AMEND', comments?: string) {
        const task = await prisma.approvalTask.findUnique({ where: { id: taskId } });
        if (!task || task.status !== 'PENDING') throw new AppError(400, 'Invalid task');

        let newTaskStatus: any = 'APPROVED';
        if (action === 'REJECT') newTaskStatus = 'REJECTED';
        if (action === 'AMEND') newTaskStatus = 'AMEND_REQUIRED';

        await prisma.approvalTask.update({
            where: { id: taskId },
            data: { status: newTaskStatus, comments },
        });

        // In a full engine, we'd check if all parallel tasks are done, then move to next node.
        // Here we just update the instance status for simplicity.
        await prisma.workflowInstance.update({
            where: { id: task.instanceId },
            data: { status: newTaskStatus === 'APPROVED' ? 'COMPLETED' : newTaskStatus },
        });

        return { success: true };
    }
}

export const workflowService = new WorkflowService();
