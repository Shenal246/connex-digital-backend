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

const router = Router();

// All settings routes require authentication
router.use(requireAuth);

router.patch('/profile', updateProfileController);
router.post('/request-password-change', requestPasswordChangeController);
router.post('/change-password', changePasswordController);
router.post('/mfa/setup', setupMfaController);
router.post('/mfa/enable', enableMfaController);
router.post('/mfa/disable', disableMfaController);

export default router;
