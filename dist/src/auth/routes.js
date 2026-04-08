"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const controller_1 = require("./controller");
const refreshController_1 = require("./refreshController");
const middleware_1 = require("../audit/middleware");
const router = (0, express_1.Router)();
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests, please try again later.' } },
});
router.post('/login', authLimiter, controller_1.loginController);
router.post('/logout', controller_1.logoutController);
router.post('/refresh', refreshController_1.refreshController);
router.post('/verify-otp', controller_1.verifyOtpController);
router.post('/change-password', (0, middleware_1.auditAction)('AUTH_PASSWORD_CHANGE', 'Auth'), controller_1.changePasswordController);
router.post('/forgot-password', (0, middleware_1.auditAction)('AUTH_PASSWORD_FORGOT', 'Auth'), controller_1.forgotPasswordController);
router.post('/reset-password', (0, middleware_1.auditAction)('AUTH_PASSWORD_RESET', 'Auth'), controller_1.resetPasswordController);
exports.default = router;
