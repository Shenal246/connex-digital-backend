import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from './errorHandler';

export interface UserPayload {
    userId: string;
}

declare global {
    namespace Express {
        interface Request {
            user?: UserPayload;
            id: string; // From pino-http
        }
    }
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return next(new AppError(401, 'Unauthorized: No token provided'));
    }

    const token = authHeader.split(' ')[1];
    try {
        const payload = jwt.verify(token, env.JWT_SECRET) as UserPayload;
        req.user = payload;
        next();
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            return next(new AppError(401, 'Unauthorized: Token expired', { expired: true }));
        }
        return next(new AppError(401, 'Unauthorized: Invalid token'));
    }
};

export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return next();
    }

    const token = authHeader.split(' ')[1];
    try {
        const payload = jwt.verify(token, env.JWT_SECRET) as UserPayload;
        req.user = payload;
        next();
    } catch (error) {
        // Just continue without user payload if token is invalid/expired
        next();
    }
};
