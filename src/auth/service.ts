import { prisma } from '../common/utils/db';
import * as argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { env } from '../common/config/env';
import { AppError } from '../common/middlewares/errorHandler';
import { logger } from '../common/utils/logger';
import crypto from 'node:crypto';
import { emailService } from '../common/utils/emailService';
import { TOTP, NobleCryptoPlugin, ScureBase32Plugin } from 'otplib';

const totp = new TOTP({
    crypto: new NobleCryptoPlugin(),
    base32: new ScureBase32Plugin()
});

const ACCESS_TOKEN_EXPIRATION = '15m'; // Short-lived access token
const REFRESH_TOKEN_EXPIRATION_DAYS = 7;

type TokenPayload = {
    userId: string;
    tokenId?: string; // For refresh token id/jti
};

export class AuthService {
    // Mock email sender
    private sendEmail(to: string, subject: string, body: string) {
        logger.info(`[MOCK EMAIL] To: ${to} | Subject: ${subject} | Body: ${body}`);
    }

    /** SHA-256 hash helper — used for storing tokens in the DB safely */
    private hashToken(token: string): string {
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    generateTokens(userId: string) {
        const accessToken = jwt.sign({ userId }, env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRATION });
        const tokenId = crypto.randomUUID();
        const refreshToken = jwt.sign({ userId, tokenId }, env.JWT_REFRESH_SECRET, {
            expiresIn: `${REFRESH_TOKEN_EXPIRATION_DAYS}d`,
        });

        // Persist the hash — allows logout-based revocation and rotation
        const tokenHash = this.hashToken(refreshToken);
        const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRATION_DAYS * 24 * 60 * 60 * 1000);
        prisma.refreshToken.create({
            data: { tokenHash, userId, expiresAt },
        }).catch((e) => logger.error(e, '[AUTH] Failed to persist refresh token'));

        return { accessToken, refreshToken, tokenId };
    }

    async login(email: string, password: string, ip?: string, userAgent?: string) {
        let user;
        try {
            user = await prisma.user.findUnique({ where: { email } });
        } catch (dbErr) {
            logger.error(dbErr, '[AUTH] DB error looking up user');
            throw new AppError(500, 'Database error. Please try again later.');
        }

        if (!user) {
            throw new AppError(401, 'Invalid credentials');
        }

        if (user.lockedOutUntil && user.lockedOutUntil > new Date()) {
            throw new AppError(403, 'Account is temporarily locked due to multiple failed login attempts.');
        }

        if (!(user as any).isActive) {
            throw new AppError(403, 'Your account has been disabled. Please contact an administrator.');
        }

        if (user.isInvited && !user.passwordHash) {
            throw new AppError(403, 'Account not fully set up. Please use the invite link sent to your email.');
        }

        if (!user.passwordHash) {
            throw new AppError(401, 'Account lacks credentials. Contact administrator.');
        }

        const isValid = await argon2.verify(user.passwordHash, password);

        if (!isValid) {
            const attempts = user.failedLoginAttempts + 1;
            const updates: any = { failedLoginAttempts: attempts };
            if (attempts >= 3) {
                updates.lockedOutUntil = new Date(Date.now() + 30 * 1000);
            }
            await prisma.user.update({ where: { id: user.id }, data: updates }).catch((e) => logger.error(e, '[AUTH] Failed to update failed attempts'));

            // Non-blocking audit log
            prisma.auditLog.create({
                data: { userId: user.id, action: 'LOGIN_FAIL', status: 'FAIL', ip, userAgent, metadata: { reason: 'Invalid password' } },
            }).catch((e) => logger.error(e, '[AUTH] Failed to write audit log LOGIN_FAIL'));

            throw new AppError(401, 'Invalid credentials');
        }

        if (user.failedLoginAttempts > 0 || user.lockedOutUntil) {
            await prisma.user.update({
                where: { id: user.id },
                data: { failedLoginAttempts: 0, lockedOutUntil: null },
            }).catch((e) => logger.error(e, '[AUTH] Failed to reset failed attempts'));
        }

        const tempToken = jwt.sign({ userId: user.id, action: (user as any).mustChangePassword ? 'CHANGE_PASSWORD' : 'VERIFY_OTP' }, env.JWT_SECRET, { expiresIn: '15m' });

        if ((user as any).mustChangePassword) {
            return {
                requirePasswordChange: true,
                tempToken,
            };
        }

        if (user.mfaEnabled && user.mfaSecret) {
            return {
                requireMfa: true,
                tempToken,
            };
        }

        // Default or legacy behavior: Email OTP
        const otp = crypto.randomInt(100000, 999999).toString();
        const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

        await prisma.user.update({
            where: { id: user.id },
            data: {
                otpSecret: otp,
                otpExpiresAt,
            } as any
        });

        // Dispatch OTP Email
        emailService.sendOtpEmail(user.email, otp).catch(err => logger.error(err, 'Failed to send OTP email'));

        return {
            requireOtp: true,
            tempToken,
        };
    }

    async verifyOtp(userId: string, otp: string, ip?: string, userAgent?: string) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new AppError(401, 'User not found');
        }

        let isValid = false;

        if (user.mfaEnabled && user.mfaSecret) {
            const result = await (totp as any).verify(otp, { secret: user.mfaSecret });
            isValid = result.valid === true;
        } else if ((user as any).otpSecret === otp && (user as any).otpExpiresAt && (user as any).otpExpiresAt > new Date()) {
            // Email OTP Verification
            isValid = true;
        }

        if (!isValid) {
            const attempts = user.failedLoginAttempts + 1;
            if (attempts >= 3) {
                // Invalidate the session/OTP after 3 failed attempts
                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        otpSecret: null,
                        otpExpiresAt: null,
                        failedLoginAttempts: 0 // Reset for next login
                    } as any
                }).catch((e) => logger.error(e, '[AUTH] Failed to invalidate OTP session'));

                throw new AppError(401, 'Too many failed attempts. Please login again.');
            }

            await prisma.user.update({
                where: { id: user.id },
                data: { failedLoginAttempts: attempts }
            }).catch((e) => logger.error(e, '[AUTH] Failed to update failed OTP attempts'));

            throw new AppError(401, `Invalid or expired code. ${3 - attempts} attempts remaining.`);
        }

        // Clear OTP if it was an email OTP
        if (!user.mfaEnabled) {
            await prisma.user.update({
                where: { id: user.id },
                data: { otpSecret: null, otpExpiresAt: null } as any,
            });
        }

        const tokens = this.generateTokens(user.id);
        prisma.auditLog.create({
            data: { userId: user.id, action: user.mfaEnabled ? 'LOGIN_SUCCESS_MFA' : 'LOGIN_SUCCESS_OTP', status: 'SUCCESS', ip, userAgent },
        }).catch((e) => logger.error(e, '[AUTH] Failed to write audit log LOGIN_SUCCESS'));

        return { user, tokens };
    }

    async changePassword(userId: string, newPassword: string) {
        const passwordHash = await argon2.hash(newPassword);
        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                passwordHash,
                mustChangePassword: false,
                otpSecret: null, // Clear any latent OTPs
                otpExpiresAt: null,
            } as any
        });

        const tokens = this.generateTokens(user.id);
        return { user, tokens };
    }

    async resetPassword(token: string, newPassword: string) {
        // Hash the incoming token before querying — tokens are stored as hashes
        const tokenHash = this.hashToken(token);
        const user = await prisma.user.findFirst({
            where: {
                resetPasswordToken: tokenHash,
                resetPasswordExpiresAt: {
                    gt: new Date()
                }
            } as any
        });

        if (!user) {
            throw new AppError(401, 'Invalid or expired password reset token');
        }

        const passwordHash = await argon2.hash(newPassword);
        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash,
                resetPasswordToken: null,
                resetPasswordExpiresAt: null,
                mustChangePassword: false,
            } as any
        });

        const tokens = this.generateTokens(updatedUser.id);
        return { user: updatedUser, tokens };
    }

    async forgotPassword(email: string) {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            // We return success even if user not found to prevent email enumeration
            return;
        }

        // Generate a raw token for the email link, store only the SHA-256 hash in the DB
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetPasswordExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
        const resetTokenHash = this.hashToken(resetToken);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetPasswordToken: resetTokenHash,
                resetPasswordExpiresAt,
            } as any
        });

        const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`;

        emailService.sendPasswordResetEmail(user.email, resetLink).catch(err => logger.error(err, 'Failed to send reset email'));
    }
}

export const authService = new AuthService();
