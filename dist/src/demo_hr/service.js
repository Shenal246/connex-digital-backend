"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requisitionService = exports.ManpowerRequisitionService = void 0;
const db_1 = require("../common/utils/db");
const service_1 = require("../workflow/service");
const errorHandler_1 = require("../common/middlewares/errorHandler");
class ManpowerRequisitionService {
    async createRequisition(userId, data) {
        const requisition = await db_1.prisma.manpowerRequisition.create({
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
        const instance = await service_1.workflowService.triggerEvent(triggerEvent, requisition.id, context);
        if (!instance) {
            // If no published workflow exists, maybe auto-approve it or leave it as DRAFT depending on logic.
            // We will leave it as PENDING_APPROVAL and maybe warn.
        }
        return requisition;
    }
    async getRequisition(id) {
        const req = await db_1.prisma.manpowerRequisition.findUnique({
            where: { id },
            include: {
                createdBy: { select: { name: true, email: true } },
            },
        });
        if (!req)
            throw new errorHandler_1.AppError(404, 'Requisition not found');
        // Also fetch the linked workflow instance
        const instances = await db_1.prisma.workflowInstance.findMany({
            where: { triggerEntityId: id },
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { tasks: true }
        });
        return { requisition: req, workflowInstance: instances[0] || null };
    }
    async listRequisitions() {
        return await db_1.prisma.manpowerRequisition.findMany({
            orderBy: { createdAt: 'desc' },
            include: { createdBy: { select: { name: true } } },
        });
    }
}
exports.ManpowerRequisitionService = ManpowerRequisitionService;
exports.requisitionService = new ManpowerRequisitionService();
