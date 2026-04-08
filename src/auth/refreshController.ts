import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { env } from '../common/config/env';
import { authService } from './service';
import { prisma } from '../common/utils/db';
import { AppError } from '../common/middlewares/errorHandler';

/** Helper: SHA-256 hash of a token string */
const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

export const refreshController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) throw new AppError(401, 'No refresh token provided');

        // 1. Verify JWT signature
        let payload: any;
        try {
            payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
        } catch (err) {
            res.clearCookie('refreshToken');
            throw new AppError(401, 'Invalid or expired refresh token');
        }

        // 2. Validate the token hash exists in the DB (revocation check)
        const tokenHash = hashToken(refreshToken);
        const storedToken = await prisma.refreshToken.findUnique({
            where: { tokenHash },
        });

        if (!storedToken) {
            // Token was already rotated or explicitly revoked (e.g., post-logout)
            res.clearCookie('refreshToken');
            throw new AppError(401, 'Refresh token has been revoked or already used');
        }

        // 3. Delete the old token record (rotation — each token is single-use)
        await prisma.refreshToken.delete({ where: { tokenHash } });

        // 4. Issue new token pair (the new refresh token hash is stored inside generateTokens)
        const newTokens = authService.generateTokens(payload.userId);

        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: { id: true, email: true, name: true, roleId: true, mfaEnabled: true }
        });

        if (!user) throw new AppError(401, 'User no longer exists');

        res.cookie('refreshToken', newTokens.refreshToken, {
            httpOnly: true,
            secure: env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.json({
            success: true,
            data: {
                accessToken: newTokens.accessToken,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    mfaEnabled: user.mfaEnabled,
                }
            },
        });

    } catch (err) {
        next(err);
    }
};
