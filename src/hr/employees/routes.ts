import { Router } from 'express';
import { employeeController } from './controller';
import { requirePermission } from '../../iam/middleware';
import { auditAction } from '../../audit/middleware';

const router = Router();

const MODULE = 'hr';
const RESOURCE = 'employees';

router.post('/', requirePermission(MODULE, RESOURCE, 'CREATE'), auditAction('HR_EMPLOYEE_CREATE', 'Employee'), employeeController.createEmployee);
router.get('/', requirePermission(MODULE, RESOURCE, 'READ'), employeeController.getEmployees);
router.get('/hierarchy', requirePermission(MODULE, RESOURCE, 'READ'), employeeController.getHierarchy);
router.get('/:id', requirePermission(MODULE, RESOURCE, 'READ'), employeeController.getEmployeeById);
router.patch('/:id', requirePermission(MODULE, RESOURCE, 'UPDATE'), auditAction('HR_EMPLOYEE_UPDATE', 'Employee'), employeeController.updateEmployee);
router.delete('/:id', requirePermission(MODULE, RESOURCE, 'DELETE'), auditAction('HR_EMPLOYEE_DELETE', 'Employee'), employeeController.deleteEmployee);

export default router;
