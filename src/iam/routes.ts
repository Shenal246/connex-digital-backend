import { Router } from 'express';
import { requireAuth } from '../common/middlewares/auth';
import { requirePermission } from './middleware';
import { getRoles, createRole, updateRole, deleteRole, updateRolePermissions, getUsers, createUser, updateUser, deleteUser, getAllPermissions, registerPermission, deletePermission, getEffectivePermissions, getSystemModules, registerSystemModule, updateSystemModule, deleteSystemModule, registerResource, deleteResource, adminResetPassword } from './controller';
import { auditAction } from '../audit/middleware';

const router = Router();

// Secure all IAM routes
router.use(requireAuth);

router.get('/roles', requirePermission('iam', 'roles', 'READ'), getRoles);
router.post('/roles', requirePermission('iam', 'roles', 'CREATE'), auditAction('ROLE_CREATE', 'Role'), createRole);
router.put('/roles/:id', requirePermission('iam', 'roles', 'UPDATE'), auditAction('ROLE_UPDATE', 'Role'), updateRole);
router.delete('/roles/:id', requirePermission('iam', 'roles', 'DELETE'), auditAction('ROLE_DELETE', 'Role'), deleteRole);
router.put('/roles/:id/permissions', requirePermission('iam', 'roles', 'UPDATE'), auditAction('ROLE_PERMISSIONS_UPDATE', 'Role'), updateRolePermissions);

router.get('/users', requirePermission('iam', 'users', 'READ'), getUsers);
router.post('/users', requirePermission('iam', 'users', 'CREATE'), auditAction('USER_CREATE', 'User'), createUser);
router.put('/users/:id', requirePermission('iam', 'users', 'UPDATE'), auditAction('USER_UPDATE', 'User'), updateUser);
router.delete('/users/:id', requirePermission('iam', 'users', 'DELETE'), auditAction('USER_DELETE', 'User'), deleteUser);
router.post('/users/:id/reset-password', requirePermission('iam', 'users', 'UPDATE'), auditAction('USER_PASSWORD_RESET_ADMIN', 'User'), adminResetPassword);

router.get('/permissions', requirePermission('iam', 'roles', 'READ'), getAllPermissions);
router.post('/permissions', requirePermission('iam', 'roles', 'CREATE'), auditAction('PERMISSION_CREATE', 'Permission'), registerPermission);
router.delete('/permissions/:id', requirePermission('iam', 'roles', 'DELETE'), auditAction('PERMISSION_DELETE', 'Permission'), deletePermission);
router.get('/users/:userId/permissions', getEffectivePermissions);

router.get('/modules', getSystemModules);
router.post('/modules', requirePermission('iam', 'roles', 'CREATE'), auditAction('MODULE_CREATE', 'Module'), registerSystemModule);
router.put('/modules/:id', requirePermission('iam', 'roles', 'UPDATE'), auditAction('MODULE_UPDATE', 'Module'), updateSystemModule);
router.delete('/modules/:id', requirePermission('iam', 'roles', 'DELETE'), auditAction('MODULE_DELETE', 'Module'), deleteSystemModule);

router.post('/resources', requirePermission('iam', 'roles', 'CREATE'), auditAction('RESOURCE_CREATE', 'Resource'), registerResource);
router.delete('/resources/:id', requirePermission('iam', 'roles', 'DELETE'), auditAction('RESOURCE_DELETE', 'Resource'), deleteResource);

export default router;
