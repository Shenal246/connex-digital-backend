import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../common/config/env';
import { authService } from './service';
import { prisma } from '../common/utils/db';
import { AppError } from '../common/middlewares/errorHandler';

export const refreshController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) throw new AppError(401, 'No refresh token provided');

        // Verify token
        let payload: any;
        try {
            payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
        } catch (err) {
            // Invalidate cookie
            res.clearCookie('refreshToken');
            throw new AppError(401, 'Invalid or expired refresh token');
        }

        // Instead of doing authService.login, we just generate tokens inline for speed,
        // or add a method to authService. Let's add it to controller.
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
