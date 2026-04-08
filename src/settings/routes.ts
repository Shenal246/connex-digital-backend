import { Router } from 'express';
import {
    updateProfileController,
    requestPasswordChangeController,
    changePasswordController,
    setupMfaController,
    enableMfaController,
    disableMfaController
} from './controller';
import { requireAuth } from '../common/middlewares/auth';
import { auditAction } from '../audit/middleware';

const router = Router();

// All settings routes require authentication
router.use(requireAuth);

router.patch('/profile', auditAction('SETTINGS_PROFILE_UPDATE', 'User'), updateProfileController);
router.post('/request-password-change', auditAction('SETTINGS_PASSWORD_CHANGE_REQUEST', 'User'), requestPasswordChangeController);
router.post('/change-password', auditAction('SETTINGS_PASSWORD_CHANGE', 'User'), changePasswordController);
router.post('/mfa/setup', auditAction('SETTINGS_MFA_SETUP', 'User'), setupMfaController);
router.post('/mfa/enable', auditAction('SETTINGS_MFA_ENABLE', 'User'), enableMfaController);
router.post('/mfa/disable', auditAction('SETTINGS_MFA_DISABLE', 'User'), disableMfaController);

export default router;
