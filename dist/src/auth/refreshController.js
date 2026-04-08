"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshController = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../common/config/env");
const service_1 = require("./service");
const db_1 = require("../common/utils/db");
const errorHandler_1 = require("../common/middlewares/errorHandler");
const refreshController = async (req, res, next) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken)
            throw new errorHandler_1.AppError(401, 'No refresh token provided');
        // Verify token
        let payload;
        try {
            payload = jsonwebtoken_1.default.verify(refreshToken, env_1.env.JWT_REFRESH_SECRET);
        }
        catch (err) {
            // Invalidate cookie
            res.clearCookie('refreshToken');
            throw new errorHandler_1.AppError(401, 'Invalid or expired refresh token');
        }
        // Instead of doing authService.login, we just generate tokens inline for speed,
        // or add a method to authService. Let's add it to controller.
        const newTokens = service_1.authService.generateTokens(payload.userId);
        const user = await db_1.prisma.user.findUnique({
            where: { id: payload.userId },
            select: { id: true, email: true, name: true, roleId: true, mfaEnabled: true }
        });
        if (!user)
            throw new errorHandler_1.AppError(401, 'User no longer exists');
        res.cookie('refreshToken', newTokens.refreshToken, {
            httpOnly: true,
            secure: env_1.env.NODE_ENV === 'production',
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
    }
    catch (err) {
        next(err);
    }
};
exports.refreshController = refreshController;
