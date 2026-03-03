import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { loginController, logoutController, verifyOtpController, changePasswordController, resetPasswordController, forgotPasswordController } from './controller';
import { refreshController } from './refreshController';
import { auditAction } from '../audit/middleware';

const router = Router();

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests, please try again later.' } },
});

router.post('/login', authLimiter, loginController);
router.post('/logout', logoutController);
router.post('/refresh', refreshController);
router.post('/verify-otp', verifyOtpController);
router.post('/change-password', auditAction('AUTH_PASSWORD_CHANGE', 'Auth'), changePasswordController);
router.post('/forgot-password', auditAction('AUTH_PASSWORD_FORGOT', 'Auth'), forgotPasswordController);
router.post('/reset-password', auditAction('AUTH_PASSWORD_RESET', 'Auth'), resetPasswordController);

export default router;
