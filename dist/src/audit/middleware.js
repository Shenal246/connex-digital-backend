"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditAction = void 0;
const db_1 = require("../common/utils/db");
const logger_1 = require("../common/utils/logger");
const auditAction = (action, entityType) => {
    return async (req, res, next) => {
        // We hook into res.on('finish') to log after the request is processed
        res.on('finish', async () => {
            const status = res.statusCode >= 200 && res.statusCode < 400 ? 'SUCCESS' : 'FAIL';
            const userId = req.user?.userId || null;
            const ip = req.ip || req.socket.remoteAddress || null;
            const userAgent = req.headers['user-agent'] || null;
            // Attempt to extract entityId from params or body if any
            const entityId = req.params?.id || req.body?.id || null;
            try {
                await db_1.prisma.auditLog.create({
                    data: {
                        action,
                        entityType,
                        entityId,
                        status,
                        userId,
                        ip,
                        userAgent,
                        requestId: req.id,
                        metadata: {
                            method: req.method,
                            path: req.originalUrl,
                            statusCode: res.statusCode,
                        },
                    },
                });
            }
            catch (err) {
                logger_1.logger.error(err, 'Failed to save audit log');
            }
        });
        next();
    };
};
exports.auditAction = auditAction;
