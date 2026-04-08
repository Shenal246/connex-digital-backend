import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { validateSignature, generateSignature } from '../utils/securityUtils';
import { AppError } from './errorHandler';

/**
 * Middleware to enforce payload integrity via HMAC signatures.
 * 
 * 1. Checks 'x-request-signature' for incoming requests with bodies.
 * 2. Attaches 'x-response-signature' to outgoing JSON responses.
 */
export const signatureMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
    
    // 1. Verify Request Signature
    // We only strictly require signature if there's a body. 
    // For GET/DELETE without body, we could skip or sign query params, 
    // but per plan we focus on bodies first.
    if (isMutating && req.body && Object.keys(req.body).length > 0) {
        const signature = req.headers['x-request-signature'] as string;
        
        if (!signature || !validateSignature(req.body, signature, env.API_PAYLOAD_SECRET)) {
            return next(new AppError(403, 'Invalid or missing request signature. Payload integrity check failed.'));
        }
    }

    // 2. Wrap res.json to sign the response
    const originalJson = res.json;
    res.json = function (body: any) {
        // Only sign if it's a success response and has data
        if (res.statusCode >= 200 && res.statusCode < 300 && body) {
            const signature = generateSignature(body, env.API_PAYLOAD_SECRET);
            res.setHeader('x-response-signature', signature);
        }
        return originalJson.call(this, body);
    };

    next();
};
