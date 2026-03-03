import { Request, Response, NextFunction } from 'express';
import { prisma } from '../common/utils/db';
import { z } from 'zod';

const getLogsSchema = z.object({
    page: z.string().default('1').transform(Number),
    limit: z.string().default('20').transform(Number),
    action: z.string().optional(),
    status: z.string().optional(),
    userId: z.string().optional(),
    search: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
});

export const getLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const query = getLogsSchema.parse(req.query);
        const { page, limit, action, status, userId, search, startDate, endDate } = query;

        const skip = (page - 1) * limit;

        const where: any = {};
        if (status) where.status = status;
        if (userId) where.userId = userId;

        if (search) {
            where.OR = [
                { action: { contains: search, mode: 'insensitive' } },
                { user: { name: { contains: search, mode: 'insensitive' } } },
                { user: { email: { contains: search, mode: 'insensitive' } } },
            ];
        } else if (action) {
            where.action = { contains: action, mode: 'insensitive' };
        }

        if (startDate || endDate) {
            where.timestamp = {};
            if (startDate) where.timestamp.gte = new Date(startDate);
            if (endDate) where.timestamp.lte = new Date(endDate);
        }

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
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
            prisma.auditLog.count({ where })
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
    } catch (err) {
        next(err);
    }
};

export const getAdvancedAnalytics = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const now = new Date();
        const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const [activeUsersCount, totalUsers, inactiveUsers, weeklyTrend, actionDistribution, successMetrics, hourlyRaw] = await Promise.all([
            // Users active in last 24h
            prisma.auditLog.groupBy({
                by: ['userId'],
                where: { timestamp: { gte: last24h }, userId: { not: null } },
            }).then(res => res.length),

            // Total users in system
            prisma.user.count(),

            // Users who haven't used the system for more than 7 days
            prisma.user.findMany({
                where: {
                    OR: [
                        { auditLogs: { none: {} } }, // Never used
                        { auditLogs: { every: { timestamp: { lt: last7d } } } } // Not used in last 7 days
                    ]
                },
                select: { id: true, name: true, email: true },
                take: 10
            }),

            // Weekly activity trend
            prisma.auditLog.groupBy({
                by: ['timestamp'],
                where: { timestamp: { gte: last7d } },
                _count: { _all: true }
            }),

            // Top Actions
            prisma.auditLog.groupBy({
                by: ['action'],
                _count: { _all: true },
                orderBy: { _count: { action: 'desc' } },
                take: 10
            }),

            // Security/Success Metrics
            prisma.auditLog.groupBy({
                by: ['status'],
                _count: { _all: true }
            }),

            // Hourly activity for heatmap (last 24h)
            prisma.auditLog.findMany({
                where: { timestamp: { gte: last24h } },
                select: { timestamp: true }
            })
        ]);

        // Process weekly trend into daily buckets
        const dailyTrend: Record<string, number> = {};
        for (let i = 0; i < 7; i++) {
            const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            dailyTrend[date] = 0;
        }

        weeklyTrend.forEach(item => {
            const date = item.timestamp.toISOString().split('T')[0];
            if (dailyTrend[date] !== undefined) {
                dailyTrend[date] += item._count._all;
            }
        });

        const hourlyMap: Record<number, number> = {};
        for (let i = 0; i < 24; i++) hourlyMap[i] = 0;

        hourlyRaw.forEach(log => {
            const hour = new Date(log.timestamp).getHours();
            hourlyMap[hour]++;
        });

        const hourlyActivity = Object.entries(hourlyMap).map(([hour, count]) => ({
            hour: parseInt(hour),
            display: `${hour}:00`,
            count
        }));

        res.json({
            success: true,
            data: {
                activeUsers: activeUsersCount,
                totalUsers,
                inactiveUsers,
                trend: Object.entries(dailyTrend).map(([date, count]) => ({ date, count })).reverse(),
                actionDistribution: actionDistribution.map(item => ({ action: item.action, count: item._count._all })),
                successMetrics: successMetrics.reduce((acc: any, curr) => {
                    acc[curr.status] = curr._count._all;
                    return acc;
                }, { SUCCESS: 0, FAIL: 0 }),
                hourlyActivity
            }
        });
    } catch (err) {
        next(err);
    }
};

export const getLogStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [totalToday, failedToday, distinctActions] = await Promise.all([
            prisma.auditLog.count({ where: { timestamp: { gte: today } } }),
            prisma.auditLog.count({ where: { timestamp: { gte: today }, status: 'FAIL' } }),
            prisma.auditLog.groupBy({
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
    } catch (err) {
        next(err);
    }
};
