import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

/**
 * Middleware to validate the x-api-key header.
 */
export const apiKey = (req: Request, res: Response, next: NextFunction) => {
    const providedKey = req.headers['x-api-key'];

    if (!providedKey) {
        return res.status(401).json({
            status: 'error',
            message: 'API key is missing',
        });
    }

    if (providedKey !== env.API_KEY) {
        return res.status(403).json({
            status: 'error',
            message: 'Invalid API key',
        });
    }

    next();
};
