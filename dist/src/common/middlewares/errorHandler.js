"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.AppError = void 0;
const zod_1 = require("zod");
const logger_1 = require("../utils/logger");
class AppError extends Error {
    statusCode;
    message;
    details;
    constructor(statusCode, message, details) {
        super(message);
        this.statusCode = statusCode;
        this.message = message;
        this.details = details;
        this.name = 'AppError';
    }
}
exports.AppError = AppError;
const errorHandler = (err, req, res, next) => {
    if (err instanceof zod_1.ZodError) {
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
    if (err.code === 'P2002') {
        const target = err.meta?.target || [];
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
    logger_1.logger.error(err, 'Unhandled Error');
    res.status(500).json({
        success: false,
        error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected error occurred',
        },
    });
};
exports.errorHandler = errorHandler;
