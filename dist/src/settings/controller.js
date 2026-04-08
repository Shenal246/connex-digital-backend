"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.disableMfaController = exports.enableMfaController = exports.setupMfaController = exports.changePasswordController = exports.requestPasswordChangeController = exports.updateProfileController = void 0;
const zod_1 = require("zod");
const service_1 = require("./service");
const updateProfileSchema = zod_1.z.object({
    name: zod_1.z.string().optional(),
});
const changePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string(),
    newPassword: zod_1.z.string().min(8),
    otp: zod_1.z.string().length(6),
});
const verifyMfaSchema = zod_1.z.object({
    token: zod_1.z.string().length(6),
});
const updateProfileController = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const data = updateProfileSchema.parse(req.body);
        const user = await service_1.settingsService.updateProfile(userId, data);
        res.json({ success: true, data: user });
    }
    catch (error) {
        next(error);
    }
};
exports.updateProfileController = updateProfileController;
const requestPasswordChangeController = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const result = await service_1.settingsService.requestPasswordChange(userId);
        res.json({ success: true, data: result });
    }
    catch (error) {
        next(error);
    }
};
exports.requestPasswordChangeController = requestPasswordChangeController;
const changePasswordController = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { currentPassword, newPassword, otp } = changePasswordSchema.parse(req.body);
        const result = await service_1.settingsService.changePassword(userId, currentPassword, newPassword, otp);
        res.json({ success: true, data: result });
    }
    catch (error) {
        next(error);
    }
};
exports.changePasswordController = changePasswordController;
const setupMfaController = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const result = await service_1.settingsService.setupMfa(userId);
        res.json({ success: true, data: result });
    }
    catch (error) {
        next(error);
    }
};
exports.setupMfaController = setupMfaController;
const enableMfaController = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { token } = verifyMfaSchema.parse(req.body);
        const result = await service_1.settingsService.enableMfa(userId, token);
        res.json({ success: true, data: result });
    }
    catch (error) {
        next(error);
    }
};
exports.enableMfaController = enableMfaController;
const disableMfaController = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const result = await service_1.settingsService.disableMfa(userId);
        res.json({ success: true, data: result });
    }
    catch (error) {
        next(error);
    }
};
exports.disableMfaController = disableMfaController;
