import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { settingsService } from './service';

const updateProfileSchema = z.object({
    name: z.string().optional(),
});

const changePasswordSchema = z.object({
    currentPassword: z.string(),
    newPassword: z.string().min(8),
    otp: z.string().length(6),
});

const verifyMfaSchema = z.object({
    token: z.string().length(6),
});

export const updateProfileController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.userId;
        const data = updateProfileSchema.parse(req.body);
        const user = await settingsService.updateProfile(userId, data);
        res.json({ success: true, data: user });
    } catch (error) {
        next(error);
    }
};

export const requestPasswordChangeController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.userId;
        const result = await settingsService.requestPasswordChange(userId);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
};

export const changePasswordController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.userId;
        const { currentPassword, newPassword, otp } = changePasswordSchema.parse(req.body);
        const result = await settingsService.changePassword(userId, currentPassword, newPassword, otp);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
};

export const setupMfaController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.userId;
        const result = await settingsService.setupMfa(userId);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
};

export const enableMfaController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.userId;
        const { token } = verifyMfaSchema.parse(req.body);
        const result = await settingsService.enableMfa(userId, token);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
};

export const disableMfaController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.userId;
        const result = await settingsService.disableMfa(userId);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
};
