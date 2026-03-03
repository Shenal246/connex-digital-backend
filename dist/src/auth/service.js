"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = exports.AuthService = void 0;
const db_1 = require("../common/utils/db");
const argon2 = __importStar(require("argon2"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../common/config/env");
const errorHandler_1 = require("../common/middlewares/errorHandler");
const logger_1 = require("../common/utils/logger");
const node_crypto_1 = __importDefault(require("node:crypto"));
const ACCESS_TOKEN_EXPIRATION = '15m'; // Short-lived access token
const REFRESH_TOKEN_EXPIRATION_DAYS = 7;
class AuthService {
    // Mock email sender
    sendEmail(to, subject, body) {
        logger_1.logger.info(`[MOCK EMAIL] To: ${to} | Subject: ${subject} | Body: ${body}`);
    }
    generateTokens(userId) {
        const accessToken = jsonwebtoken_1.default.sign({ userId }, env_1.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRATION });
        const tokenId = node_crypto_1.default.randomUUID();
        const refreshToken = jsonwebtoken_1.default.sign({ userId, tokenId }, env_1.env.JWT_REFRESH_SECRET, {
            expiresIn: `${REFRESH_TOKEN_EXPIRATION_DAYS}d`,
        });
        return { accessToken, refreshToken, tokenId };
    }
    async login(email, password, ip, userAgent) {
        let user;
        try {
            user = await db_1.prisma.user.findUnique({ where: { email } });
        }
        catch (dbErr) {
            logger_1.logger.error(dbErr, '[AUTH] DB error looking up user');
            throw new errorHandler_1.AppError(500, 'Database error. Please try again later.');
        }
        if (!user) {
            throw new errorHandler_1.AppError(401, 'Invalid credentials');
        }
        if (user.lockedOutUntil && user.lockedOutUntil > new Date()) {
            throw new errorHandler_1.AppError(403, 'Account is temporarily locked due to multiple failed login attempts.');
        }
        if (user.isInvited && !user.passwordHash) {
            throw new errorHandler_1.AppError(403, 'Account not fully set up. Please use the invite link sent to your email.');
        }
        if (!user.passwordHash) {
            throw new errorHandler_1.AppError(401, 'Account lacks credentials. Contact administrator.');
        }
        const isValid = await argon2.verify(user.passwordHash, password);
        if (!isValid) {
            const attempts = user.failedLoginAttempts + 1;
            const updates = { failedLoginAttempts: attempts };
            if (attempts >= 5) {
                updates.lockedOutUntil = new Date(Date.now() + 15 * 60 * 1000);
            }
            await db_1.prisma.user.update({ where: { id: user.id }, data: updates }).catch((e) => logger_1.logger.error(e, '[AUTH] Failed to update failed attempts'));
            // Non-blocking audit log
            db_1.prisma.auditLog.create({
                data: { userId: user.id, action: 'LOGIN_FAIL', status: 'FAIL', ip, userAgent, metadata: { reason: 'Invalid password' } },
            }).catch((e) => logger_1.logger.error(e, '[AUTH] Failed to write audit log LOGIN_FAIL'));
            throw new errorHandler_1.AppError(401, 'Invalid credentials');
        }
        if (user.failedLoginAttempts > 0 || user.lockedOutUntil) {
            await db_1.prisma.user.update({
                where: { id: user.id },
                data: { failedLoginAttempts: 0, lockedOutUntil: null },
            }).catch((e) => logger_1.logger.error(e, '[AUTH] Failed to reset failed attempts'));
        }
        const tempToken = jsonwebtoken_1.default.sign({ userId: user.id, action: user.mustChangePassword ? 'CHANGE_PASSWORD' : 'VERIFY_OTP' }, env_1.env.JWT_SECRET, { expiresIn: '15m' });
        if (user.mustChangePassword) {
            return {
                requirePasswordChange: true,
                tempToken,
            };
        }
        // Generate OTP
        const otp = node_crypto_1.default.randomInt(100000, 999999).toString();
        const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins
        await db_1.prisma.user.update({
            where: { id: user.id },
            data: {
                otpSecret: otp,
                otpExpiresAt,
            }
        });
        // Dispatch OTP Email
        Promise.resolve().then(() => __importStar(require('../common/utils/emailService'))).then(({ emailService }) => {
            emailService.sendOtpEmail(user.email, otp);
        }).catch(console.error);
        return {
            requireOtp: true,
            tempToken,
        };
    }
    async verifyOtp(userId, otp, ip, userAgent) {
        const user = await db_1.prisma.user.findUnique({ where: { id: userId } });
        if (!user || user.otpSecret !== otp || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
            throw new errorHandler_1.AppError(401, 'Invalid or expired OTP');
        }
        // Clear OTP
        await db_1.prisma.user.update({
            where: { id: user.id },
            data: { otpSecret: null, otpExpiresAt: null },
        });
        const tokens = this.generateTokens(user.id);
        db_1.prisma.auditLog.create({
            data: { userId: user.id, action: 'LOGIN_SUCCESS_OTP', status: 'SUCCESS', ip, userAgent },
        }).catch((e) => logger_1.logger.error(e, '[AUTH] Failed to write audit log LOGIN_SUCCESS_OTP'));
        return { user, tokens };
    }
    async changePassword(userId, newPassword) {
        const passwordHash = await argon2.hash(newPassword);
        const user = await db_1.prisma.user.update({
            where: { id: userId },
            data: {
                passwordHash,
                mustChangePassword: false,
                otpSecret: null, // Clear any latent OTPs
                otpExpiresAt: null,
            }
        });
        const tokens = this.generateTokens(user.id);
        return { user, tokens };
    }
    async resetPassword(token, newPassword) {
        const user = await db_1.prisma.user.findFirst({
            where: {
                resetPasswordToken: token,
                resetPasswordExpiresAt: {
                    gt: new Date()
                }
            }
        });
        if (!user) {
            throw new errorHandler_1.AppError(401, 'Invalid or expired password reset token');
        }
        const passwordHash = await argon2.hash(newPassword);
        const updatedUser = await db_1.prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash,
                resetPasswordToken: null,
                resetPasswordExpiresAt: null,
                mustChangePassword: false,
            }
        });
        const tokens = this.generateTokens(updatedUser.id);
        return { user: updatedUser, tokens };
    }
    async forgotPassword(email) {
        const user = await db_1.prisma.user.findUnique({ where: { email } });
        if (!user) {
            // We return success even if user not found to prevent email enumeration
            return;
        }
        const resetToken = node_crypto_1.default.randomBytes(32).toString('hex');
        const resetPasswordExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
        await db_1.prisma.user.update({
            where: { id: user.id },
            data: {
                resetPasswordToken: resetToken,
                resetPasswordExpiresAt,
            }
        });
        const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`;
        Promise.resolve().then(() => __importStar(require('../common/utils/emailService'))).then(({ emailService }) => {
            emailService.sendPasswordResetEmail(user.email, resetLink);
        }).catch(console.error);
    }
}
exports.AuthService = AuthService;
exports.authService = new AuthService();
