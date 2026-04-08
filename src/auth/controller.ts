import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authService } from './service';
import { env } from '../common/config/env';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { prisma } from '../common/utils/db';
import { logger } from '../common/utils/logger';

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
});

const verifyOtpSchema = z.object({
    tempToken: z.string(),
    otp: z.string().length(6),
});

const changePasswordSchema = z.object({
    tempToken: z.string(),
    newPassword: z.string().min(8),
});

const forgotPasswordSchema = z.object({
    email: z.string().email(),
});

const resetPasswordSchema = z.object({
    token: z.string(),
    newPassword: z.string().min(8),
});

export const loginController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = loginSchema.parse(req.body);
        const ip = req.ip || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'];

        const result = await authService.login(email, password, ip, userAgent);

        if ('requirePasswordChange' in result || 'requireOtp' in result || 'requireMfa' in result) {
            return res.status(200).json({
                success: true,
                data: result,
            });
        }

        const { user, tokens } = result as any; // Cast safely handled by absence of interceptors

        res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        res.status(200).json({
            success: true,
            data: {
                accessToken: tokens.accessToken,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    mfaEnabled: user.mfaEnabled,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

export const logoutController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.cookies.refreshToken;
        if (token) {
            try {
                const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as { userId: string };
                if (decoded && decoded.userId) {
                    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

                    // Revoke refresh token in DB
                    await prisma.refreshToken.delete({ where: { tokenHash } }).catch(() => {
                        // Silently ignore — token may not be in DB if already rotated
                    });

                    await prisma.auditLog.create({
                        data: {
                            userId: decoded.userId,
                            action: 'LOGOUT',
                            status: 'SUCCESS',
                            ip: req.ip || req.socket.remoteAddress || '',
                            userAgent: req.headers['user-agent'] || '',
                        }
                    }).catch(e => logger.error(e, '[AUTH] Failed to log logout event'));
                }
            } catch (e) {
                // Ignore invalid tokens during logout, just proceed to clear cookie
            }
        }
        res.clearCookie('refreshToken');
        res.status(200).json({ status: 'success', data: { message: 'Logged out successfully' } });
    } catch (error) {
        next(error);
    }
};

export const verifyOtpController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { tempToken, otp } = verifyOtpSchema.parse(req.body);
        const decoded = jwt.verify(tempToken, env.JWT_SECRET) as { userId: string, action: string };

        if (decoded.action !== 'VERIFY_OTP') throw new Error('Invalid token action');

        const ip = req.ip || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'];

        const { user, tokens } = await authService.verifyOtp(decoded.userId, otp, ip, userAgent);

        res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.status(200).json({
            success: true,
            data: {
                accessToken: tokens.accessToken,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    mfaEnabled: user.mfaEnabled,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

export const changePasswordController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { tempToken, newPassword } = changePasswordSchema.parse(req.body);
        const decoded = jwt.verify(tempToken, env.JWT_SECRET) as { userId: string, action: string };

        if (decoded.action !== 'CHANGE_PASSWORD') throw new Error('Invalid token action');

        const { user, tokens } = await authService.changePassword(decoded.userId, newPassword);

        res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.status(200).json({
            success: true,
            data: {
                accessToken: tokens.accessToken,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    mfaEnabled: user.mfaEnabled,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

export const resetPasswordController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { token, newPassword } = resetPasswordSchema.parse(req.body);
        const { user, tokens } = await authService.resetPassword(token, newPassword);

        res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.status(200).json({
            success: true,
            data: {
                accessToken: tokens.accessToken,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    mfaEnabled: user.mfaEnabled,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};
export const forgotPasswordController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email } = forgotPasswordSchema.parse(req.body);
        await authService.forgotPassword(email);
        res.json({ success: true, message: 'If an account exists with this email, a reset link has been sent.' });
    } catch (err) {
        next(err);
    }
}
