import { prisma } from '../common/utils/db';
import { workflowService } from '../workflow/service';
import { AppError } from '../common/middlewares/errorHandler';

export class ManpowerRequisitionService {
    async createRequisition(userId: string, data: any) {
        const requisition = await prisma.manpowerRequisition.create({
            data: {
                title: data.title,
                division: data.division,
                justification: data.justification,
                requestedPositions: data.requestedPositions,
                createdById: userId,
                status: 'PENDING_APPROVAL',
            },
        });

        // Trigger workflow!
        const triggerEvent = 'ManpowerRequisitionCreated';

        // Provide a context payload that expressions can use (if implemented)
        const context = {
            requisitionId: requisition.id,
            division: requisition.division,
            requestedPositions: requisition.requestedPositions,
        };

        const instance = await workflowService.triggerEvent(triggerEvent, requisition.id, context);

        if (!instance) {
            // If no published workflow exists, maybe auto-approve it or leave it as DRAFT depending on logic.
            // We will leave it as PENDING_APPROVAL and maybe warn.
        }

        return requisition;
    }

    async getRequisition(id: string) {
        const req = await prisma.manpowerRequisition.findUnique({
            where: { id },
            include: {
                createdBy: { select: { name: true, email: true } },
            },
        });

        if (!req) throw new AppError(404, 'Requisition not found');

        // Also fetch the linked workflow instance
        const instances = await prisma.workflowInstance.findMany({
            where: { triggerEntityId: id },
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { tasks: true }
        });

        return { requisition: req, workflowInstance: instances[0] || null };
    }

    async listRequisitions() {
        return await prisma.manpowerRequisition.findMany({
            orderBy: { createdAt: 'desc' },
            include: { createdBy: { select: { name: true } } },
        });
    }
}

export const requisitionService = new ManpowerRequisitionService();
