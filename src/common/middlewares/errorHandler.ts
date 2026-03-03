import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';

export class AppError extends Error {
    constructor(public statusCode: number, public message: string, public details?: any) {
        super(message);
        this.name = 'AppError';
    }
}

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof ZodError) {
        const firstIssue = err.issues[0];
        const message = firstIssue ? `${firstIssue.path.join('.')}: ${firstIssue.message}` : 'Invalid request data';

        res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message,
                details: err.issues,
            },
        });
        return;
    }

    // Handle Prisma Specific Errors
    if ((err as any).code === 'P2002') {
        const target = (err as any).meta?.target || [];
        res.status(409).json({
            success: false,
            error: {
                code: 'CONFLICT_ERROR',
                message: `Record already exists with this ${target.join(', ')}`,
            },
        });
        return;
    }

    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            success: false,
            error: {
                code: 'APP_ERROR',
                message: err.message,
                details: err.details,
            },
        });
        return;
    }

    logger.error(err, 'Unhandled Error');

    res.status(500).json({
        success: false,
        error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected error occurred',
        },
    });
};
