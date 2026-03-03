"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLogStats = exports.getLogs = void 0;
const db_1 = require("../common/utils/db");
const zod_1 = require("zod");
const getLogsSchema = zod_1.z.object({
    page: zod_1.z.string().default('1').transform(Number),
    limit: zod_1.z.string().default('20').transform(Number),
    action: zod_1.z.string().optional(),
    status: zod_1.z.string().optional(),
    userId: zod_1.z.string().optional(),
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional(),
});
const getLogs = async (req, res, next) => {
    try {
        const query = getLogsSchema.parse(req.query);
        const { page, limit, action, status, userId, startDate, endDate } = query;
        const skip = (page - 1) * limit;
        const where = {};
        if (action)
            where.action = { contains: action, mode: 'insensitive' };
        if (status)
            where.status = status;
        if (userId)
            where.userId = userId;
        if (startDate || endDate) {
            where.timestamp = {};
            if (startDate)
                where.timestamp.gte = new Date(startDate);
            if (endDate)
                where.timestamp.lte = new Date(endDate);
        }
        const [logs, total] = await Promise.all([
            db_1.prisma.auditLog.findMany({
                where,
                skip,
                take: limit,
                orderBy: { timestamp: 'desc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            name: true
                        }
                    }
                }
            }),
            db_1.prisma.auditLog.count({ where })
        ]);
        res.json({
            success: true,
            data: {
                logs,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            }
        });
    }
    catch (err) {
        next(err);
    }
};
exports.getLogs = getLogs;
const getLogStats = async (req, res, next) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const [totalToday, failedToday, distinctActions] = await Promise.all([
            db_1.prisma.auditLog.count({ where: { timestamp: { gte: today } } }),
            db_1.prisma.auditLog.count({ where: { timestamp: { gte: today }, status: 'FAIL' } }),
            db_1.prisma.auditLog.groupBy({
                by: ['action'],
                _count: { _all: true },
                orderBy: { _count: { action: 'desc' } },
                take: 5
            })
        ]);
        res.json({
            success: true,
            data: {
                totalToday,
                failedToday,
                topActions: distinctActions
            }
        });
    }
    catch (err) {
        next(err);
    }
};
exports.getLogStats = getLogStats;
