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
exports.settingsService = exports.SettingsService = void 0;
const db_1 = require("../common/utils/db");
const argon2 = __importStar(require("argon2"));
const otplib_1 = require("otplib");
const qrcode_1 = __importDefault(require("qrcode"));
const errorHandler_1 = require("../common/middlewares/errorHandler");
const emailService_1 = require("../common/utils/emailService");
const crypto_1 = __importDefault(require("crypto"));
const totp = new otplib_1.TOTP({
    crypto: new otplib_1.NobleCryptoPlugin(),
    base32: new otplib_1.ScureBase32Plugin()
});
class SettingsService {
    async updateProfile(userId, data) {
        return db_1.prisma.user.update({
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
    async requestPasswordChange(userId) {
        const user = await db_1.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new errorHandler_1.AppError(404, 'User not found');
        if (user.mfaEnabled) {
            return { requireMfa: true };
        }
        const otp = crypto_1.default.randomInt(100000, 999999).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
        await db_1.prisma.user.update({
            where: { id: userId },
            data: {
                otpSecret: otp,
                otpExpiresAt: expiresAt,
            }
        });
        await emailService_1.emailService.sendOtpEmail(user.email, otp);
        return { requireEmailOtp: true };
    }
    async changePassword(userId, currentPassword, newPassword, otp) {
        const user = await db_1.prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.passwordHash) {
            throw new errorHandler_1.AppError(401, 'User not found or password not set');
        }
        const isPasswordValid = await argon2.verify(user.passwordHash, currentPassword);
        if (!isPasswordValid) {
            throw new errorHandler_1.AppError(400, 'Current password is incorrect');
        }
        // Verify OTP
        let isOtpValid = false;
        if (user.mfaEnabled && user.mfaSecret) {
            const result = await totp.verify(otp, { secret: user.mfaSecret });
            isOtpValid = result.valid === true;
        }
        else if (user.otpSecret === otp && user.otpExpiresAt && user.otpExpiresAt > new Date()) {
            isOtpValid = true;
        }
        if (!isOtpValid) {
            throw new errorHandler_1.AppError(401, 'Invalid or expired verification code');
        }
        const passwordHash = await argon2.hash(newPassword);
        await db_1.prisma.user.update({
            where: { id: userId },
            data: {
                passwordHash,
                mustChangePassword: false,
                otpSecret: null,
                otpExpiresAt: null,
            },
        });
        return { message: 'Password updated successfully' };
    }
    async setupMfa(userId) {
        const user = await db_1.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new errorHandler_1.AppError(404, 'User not found');
        const secret = totp.generateSecret();
        // generateURI top-level takes an object
        const { generateURI: gURI } = require('otplib');
        const otpauthUrl = gURI({ secret, label: user.email, issuer: 'ConnexPlatform' });
        const qrCodeDataUrl = await qrcode_1.default.toDataURL(otpauthUrl);
        // Store secret temporarily in otpSecret field
        await db_1.prisma.user.update({
            where: { id: userId },
            data: { otpSecret: secret },
        });
        return { qrCodeDataUrl, secret };
    }
    async enableMfa(userId, token) {
        const user = await db_1.prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.otpSecret) {
            throw new errorHandler_1.AppError(400, 'MFA setup not initiated');
        }
        const result = await totp.verify(token, {
            secret: user.otpSecret,
        });
        if (!result.valid) {
            throw new errorHandler_1.AppError(400, 'Invalid verification code');
        }
        await db_1.prisma.user.update({
            where: { id: userId },
            data: {
                mfaEnabled: true,
                mfaSecret: user.otpSecret,
                otpSecret: null,
                otpExpiresAt: null,
            },
        });
        return { message: 'MFA enabled successfully' };
    }
    async disableMfa(userId) {
        await db_1.prisma.user.update({
            where: { id: userId },
            data: {
                mfaEnabled: false,
                mfaSecret: null,
            },
        });
        return { message: 'MFA disabled successfully' };
    }
}
exports.SettingsService = SettingsService;
exports.settingsService = new SettingsService();
