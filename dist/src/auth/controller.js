"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.forgotPasswordController = exports.resetPasswordController = exports.changePasswordController = exports.verifyOtpController = exports.logoutController = exports.loginController = void 0;
const zod_1 = require("zod");
const service_1 = require("./service");
const env_1 = require("../common/config/env");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../common/utils/db");
const logger_1 = require("../common/utils/logger");
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
});
const verifyOtpSchema = zod_1.z.object({
    tempToken: zod_1.z.string(),
    otp: zod_1.z.string().length(6),
});
const changePasswordSchema = zod_1.z.object({
    tempToken: zod_1.z.string(),
    newPassword: zod_1.z.string().min(8),
});
const forgotPasswordSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
});
const resetPasswordSchema = zod_1.z.object({
    token: zod_1.z.string(),
    newPassword: zod_1.z.string().min(8),
});
const loginController = async (req, res, next) => {
    try {
        const { email, password } = loginSchema.parse(req.body);
        const ip = req.ip || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'];
        const result = await service_1.authService.login(email, password, ip, userAgent);
        if ('requirePasswordChange' in result || 'requireOtp' in result || 'requireMfa' in result) {
            return res.status(200).json({
                success: true,
                data: result,
            });
        }
        const { user, tokens } = result; // Cast safely handled by absence of interceptors
        res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: env_1.env.NODE_ENV === 'production',
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
    }
    catch (error) {
        next(error);
    }
};
exports.loginController = loginController;
const logoutController = async (req, res, next) => {
    try {
        const token = req.cookies.refreshToken;
        if (token) {
            try {
                const decoded = jsonwebtoken_1.default.verify(token, env_1.env.JWT_REFRESH_SECRET);
                if (decoded && decoded.userId) {
                    await db_1.prisma.auditLog.create({
                        data: {
                            userId: decoded.userId,
                            action: 'LOGOUT',
                            status: 'SUCCESS',
                            ip: req.ip || req.socket.remoteAddress || '',
                            userAgent: req.headers['user-agent'] || '',
                        }
                    }).catch(e => logger_1.logger.error(e, '[AUTH] Failed to log logout event'));
                }
            }
            catch (e) {
                // Ignore invalid tokens during logout, just proceed to clear cookie
            }
        }
        res.clearCookie('refreshToken');
        res.status(200).json({ success: true, data: { message: 'Logged out successfully' } });
    }
    catch (error) {
        next(error);
    }
};
exports.logoutController = logoutController;
const verifyOtpController = async (req, res, next) => {
    try {
        const { tempToken, otp } = verifyOtpSchema.parse(req.body);
        const decoded = jsonwebtoken_1.default.verify(tempToken, env_1.env.JWT_SECRET);
        if (decoded.action !== 'VERIFY_OTP')
            throw new Error('Invalid token action');
        const ip = req.ip || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'];
        const { user, tokens } = await service_1.authService.verifyOtp(decoded.userId, otp, ip, userAgent);
        res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: env_1.env.NODE_ENV === 'production',
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
    }
    catch (error) {
        next(error);
    }
};
exports.verifyOtpController = verifyOtpController;
const changePasswordController = async (req, res, next) => {
    try {
        const { tempToken, newPassword } = changePasswordSchema.parse(req.body);
        const decoded = jsonwebtoken_1.default.verify(tempToken, env_1.env.JWT_SECRET);
        if (decoded.action !== 'CHANGE_PASSWORD')
            throw new Error('Invalid token action');
        const { user, tokens } = await service_1.authService.changePassword(decoded.userId, newPassword);
        res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: env_1.env.NODE_ENV === 'production',
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
    }
    catch (error) {
        next(error);
    }
};
exports.changePasswordController = changePasswordController;
const resetPasswordController = async (req, res, next) => {
    try {
        const { token, newPassword } = resetPasswordSchema.parse(req.body);
        const { user, tokens } = await service_1.authService.resetPassword(token, newPassword);
        res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: env_1.env.NODE_ENV === 'production',
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
    }
    catch (error) {
        next(error);
    }
};
exports.resetPasswordController = resetPasswordController;
const forgotPasswordController = async (req, res, next) => {
    try {
        const { email } = forgotPasswordSchema.parse(req.body);
        await service_1.authService.forgotPassword(email);
        res.json({ success: true, message: 'If an account exists with this email, a reset link has been sent.' });
    }
    catch (err) {
        next(err);
    }
};
exports.forgotPasswordController = forgotPasswordController;
