import { Request, Response, NextFunction } from 'express';
import { prisma } from '../common/utils/db';
import { logger } from '../common/utils/logger';

const SENSITIVE_FIELDS = ['password', 'token', 'accessToken', 'refreshToken', 'otp', 'secret'];

const redactData = (data: any): any => {
    if (!data || typeof data !== 'object') return data;

    if (Array.isArray(data)) {
        return data.map(redactData);
    }

    const redacted = { ...data };
    for (const key in redacted) {
        if (SENSITIVE_FIELDS.includes(key.toLowerCase())) {
            redacted[key] = '[REDACTED]';
        } else if (typeof redacted[key] === 'object') {
            redacted[key] = redactData(redacted[key]);
        }
    }
    return redacted;
};

export const auditAction = (action: string, entityType?: string) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        // Capture request data before the response is finished
        const requestData = {
            body: redactData(req.body),
            params: redactData(req.params),
            query: redactData(req.query),
        };

        // We hook into res.on('finish') to log after the request is processed
        res.on('finish', async () => {
            const status = res.statusCode >= 200 && res.statusCode < 400 ? 'SUCCESS' : 'FAIL';
            const userId = req.user?.userId || null;
            const ip = req.ip || req.socket.remoteAddress || null;
            const userAgent = req.headers['user-agent'] || null;

            // Attempt to extract entityId from params or body if any
            const entityId = req.params?.id || req.body?.id || null;

            try {
                await prisma.auditLog.create({
                    data: {
                        action,
                        entityType,
                        entityId,
                        status,
                        userId,
                        ip,
                        userAgent,
                        requestId: req.id as string,
                        metadata: {
                            method: req.method,
                            path: req.originalUrl,
                            statusCode: res.statusCode,
                            request: requestData,
                        },
                    },
                });
            } catch (err) {
                logger.error(err, 'Failed to save audit log');
            }
        });

        next();
    };
};
