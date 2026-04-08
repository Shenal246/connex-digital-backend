import { Router } from 'express';
import { orgController } from './controller';
import { requirePermission } from '../../iam/middleware';
import { auditAction } from '../../audit/middleware';

const router = Router();

const MODULE = 'hr';
const RESOURCE = 'org';

// Department Routes
router.post('/departments', requirePermission(MODULE, RESOURCE, 'CREATE'), auditAction('HR_DEPT_CREATE', 'Department'), orgController.createDepartment);
router.get('/departments', requirePermission(MODULE, RESOURCE, 'READ'), orgController.getDepartments);
router.patch('/departments/:id', requirePermission(MODULE, RESOURCE, 'UPDATE'), auditAction('HR_DEPT_UPDATE', 'Department'), orgController.updateDepartment);
router.delete('/departments/:id', requirePermission(MODULE, RESOURCE, 'DELETE'), auditAction('HR_DEPT_DELETE', 'Department'), orgController.deleteDepartment);

// Designation Routes
router.post('/designations', requirePermission(MODULE, RESOURCE, 'CREATE'), auditAction('HR_DESIGNATION_CREATE', 'Designation'), orgController.createDesignation);
router.get('/designations', requirePermission(MODULE, RESOURCE, 'READ'), orgController.getDesignations);
router.patch('/designations/:id', requirePermission(MODULE, RESOURCE, 'UPDATE'), auditAction('HR_DESIGNATION_UPDATE', 'Designation'), orgController.updateDesignation);
router.delete('/designations/:id', requirePermission(MODULE, RESOURCE, 'DELETE'), auditAction('HR_DESIGNATION_DELETE', 'Designation'), orgController.deleteDesignation);

export default router;
