import { prisma } from '../common/utils/db';
import * as argon2 from 'argon2';
import { TOTP, NobleCryptoPlugin, ScureBase32Plugin } from 'otplib';
import QRCode from 'qrcode';
import { AppError } from '../common/middlewares/errorHandler';
import { logger } from '../common/utils/logger';
import { emailService } from '../common/utils/emailService';
import crypto from 'crypto';

const totp = new TOTP({
    crypto: new NobleCryptoPlugin(),
    base32: new ScureBase32Plugin()
});

export class SettingsService {
    async updateProfile(userId: string, data: { name?: string }) {
        return prisma.user.update({
            where: { id: userId },
            data: {
                name: data.name,
            },
            select: {
                id: true,
                email: true,
                name: true,
                mfaEnabled: true,
            }
        });
    }

    async requestPasswordChange(userId: string) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new AppError(404, 'User not found');

        if (user.mfaEnabled) {
            return { requireMfa: true };
        }

        const otp = crypto.randomInt(100000, 999999).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        await prisma.user.update({
            where: { id: userId },
            data: {
                otpSecret: otp,
                otpExpiresAt: expiresAt,
            } as any
        });

        await emailService.sendOtpEmail(user.email, otp);
        return { requireEmailOtp: true };
    }

    async changePassword(userId: string, currentPassword: string, newPassword: string, otp: string) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.passwordHash) {
            throw new AppError(401, 'User not found or password not set');
        }

        const isPasswordValid = await argon2.verify(user.passwordHash, currentPassword);
        if (!isPasswordValid) {
            throw new AppError(400, 'Current password is incorrect');
        }

        // Verify OTP
        let isOtpValid = false;
        if (user.mfaEnabled && user.mfaSecret) {
            const result = await (totp as any).verify(otp, { secret: user.mfaSecret });
            isOtpValid = result.valid === true;
        } else if ((user as any).otpSecret === otp && (user as any).otpExpiresAt && (user as any).otpExpiresAt > new Date()) {
            isOtpValid = true;
        }

        if (!isOtpValid) {
            throw new AppError(401, 'Invalid or expired verification code');
        }

        const passwordHash = await argon2.hash(newPassword);
        await prisma.user.update({
            where: { id: userId },
            data: {
                passwordHash,
                mustChangePassword: false,
                otpSecret: null,
                otpExpiresAt: null,
            } as any,
        });

        return { message: 'Password updated successfully' };
    }

    async setupMfa(userId: string) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new AppError(404, 'User not found');

        const secret = totp.generateSecret();
        // generateURI top-level takes an object
        const { generateURI: gURI } = require('otplib');
        const otpauthUrl = gURI({ secret, label: user.email, issuer: 'ConnexPlatform' });
        const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

        // Store secret temporarily in otpSecret field
        await prisma.user.update({
            where: { id: userId },
            data: { otpSecret: secret } as any,
        });

        return { qrCodeDataUrl, secret };
    }

    async enableMfa(userId: string, token: string) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.otpSecret) {
            throw new AppError(400, 'MFA setup not initiated');
        }

        const result = await (totp as any).verify(token, {
            secret: user.otpSecret,
        });

        if (!result.valid) {
            throw new AppError(400, 'Invalid verification code');
        }

        await prisma.user.update({
            where: { id: userId },
            data: {
                mfaEnabled: true,
                mfaSecret: user.otpSecret,
                otpSecret: null,
                otpExpiresAt: null,
            } as any,
        });

        return { message: 'MFA enabled successfully' };
    }

    async disableMfa(userId: string) {
        await prisma.user.update({
            where: { id: userId },
            data: {
                mfaEnabled: false,
                mfaSecret: null,
            },
        });

        return { message: 'MFA disabled successfully' };
    }
}

export const settingsService = new SettingsService();
