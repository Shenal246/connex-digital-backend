import { Router } from 'express';
import { requireAuth } from '../common/middlewares/auth';
import orgRoutes from './org/routes';
import employeeRoutes from './employees/routes';

const router = Router();

// Secure all HR routes
router.use(requireAuth);

router.use('/org', orgRoutes);
router.use('/employees', employeeRoutes);

export default router;
