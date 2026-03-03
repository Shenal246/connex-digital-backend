"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminResetPassword = exports.getEffectivePermissions = exports.getSystemModules = exports.deletePermission = exports.registerPermission = exports.deleteResource = exports.registerResource = exports.deleteSystemModule = exports.updateSystemModule = exports.registerSystemModule = exports.getAllPermissions = exports.deleteUser = exports.updateUser = exports.createUser = exports.getUsers = exports.updateRolePermissions = exports.deleteRole = exports.updateRole = exports.createRole = exports.getRoles = void 0;
const db_1 = require("../common/utils/db");
const zod_1 = require("zod");
const argon2 = __importStar(require("argon2"));
const node_crypto_1 = __importDefault(require("node:crypto"));
const errorHandler_1 = require("../common/middlewares/errorHandler");
// Schemas
const createRoleSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    description: zod_1.z.string().optional(),
});
const updateRoleSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).optional(),
    description: zod_1.z.string().optional(),
});
const createUserSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8).optional(),
    name: zod_1.z.string().optional(),
    roleId: zod_1.z.string().optional(),
});
const updateUserSchema = zod_1.z.object({
    email: zod_1.z.string().email().optional(),
    name: zod_1.z.string().optional(),
    roleId: zod_1.z.string().optional(),
});
const updateRolePermissionsSchema = zod_1.z.object({
    permissionIds: zod_1.z.array(zod_1.z.string()),
});
const registerSystemModuleSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    key: zod_1.z.string().min(2),
    icon: zod_1.z.string().optional(),
    route: zod_1.z.string().optional(),
    order: zod_1.z.number().optional(),
});
const registerResourceSchema = zod_1.z.object({
    moduleKey: zod_1.z.string(),
    name: zod_1.z.string().min(2),
    key: zod_1.z.string().min(2),
});
const registerPermissionSchema = zod_1.z.object({
    moduleKey: zod_1.z.string(),
    resourceKey: zod_1.z.string(),
    action: zod_1.z.string().min(2),
    roleIds: zod_1.z.array(zod_1.z.string()).optional(),
});
const getRoles = async (req, res, next) => {
    try {
        const roles = await db_1.prisma.role.findMany({
            include: {
                permissions: {
                    include: {
                        permission: {
                            include: {
                                resource: {
                                    include: { module: true }
                                }
                            }
                        }
                    }
                }
            },
        });
        res.json({ success: true, data: roles });
    }
    catch (err) {
        next(err);
    }
};
exports.getRoles = getRoles;
const createRole = async (req, res, next) => {
    try {
        const data = createRoleSchema.parse(req.body);
        const role = await db_1.prisma.role.create({
            data: {
                ...data,
                createdBy: req.user?.userId,
            },
        });
        res.status(201).json({ success: true, data: role });
    }
    catch (err) {
        next(err);
    }
};
exports.createRole = createRole;
const updateRole = async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = updateRoleSchema.parse(req.body);
        const role = await db_1.prisma.role.findUnique({ where: { id: id } });
        if (!role)
            return res.status(404).json({ success: false, error: 'Role not found' });
        if (role.isSystem && data.name && data.name !== role.name) {
            return res.status(400).json({ success: false, error: 'Cannot rename system roles' });
        }
        const updatedRole = await db_1.prisma.role.update({
            where: { id: id },
            data,
        });
        res.json({ success: true, data: updatedRole });
    }
    catch (err) {
        next(err);
    }
};
exports.updateRole = updateRole;
const deleteRole = async (req, res, next) => {
    try {
        const { id } = req.params;
        const role = await db_1.prisma.role.findUnique({ where: { id: id } });
        if (!role)
            return res.status(404).json({ success: false, error: 'Role not found' });
        if (role.isSystem)
            return res.status(400).json({ success: false, error: 'Cannot delete system roles' });
        await db_1.prisma.role.delete({ where: { id: id } });
        res.json({ success: true, message: 'Role deleted' });
    }
    catch (err) {
        next(err);
    }
};
exports.deleteRole = deleteRole;
const updateRolePermissions = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { permissionIds } = updateRolePermissionsSchema.parse(req.body);
        await db_1.prisma.$transaction(async (tx) => {
            await tx.rolePermission.deleteMany({ where: { roleId: id } });
            if (permissionIds.length > 0) {
                await tx.rolePermission.createMany({
                    data: permissionIds.map(pId => ({
                        roleId: id,
                        permissionId: pId
                    }))
                });
            }
        });
        res.json({ success: true, message: 'Permissions updated' });
    }
    catch (err) {
        next(err);
    }
};
exports.updateRolePermissions = updateRolePermissions;
// Users
const getUsers = async (req, res, next) => {
    try {
        const users = await db_1.prisma.user.findMany({
            include: { role: true },
            orderBy: { createdAt: 'desc' },
        });
        res.json({ success: true, data: users });
    }
    catch (err) {
        next(err);
    }
};
exports.getUsers = getUsers;
const createUser = async (req, res, next) => {
    try {
        const { email, password, name, roleId } = createUserSchema.parse(req.body);
        let finalPassword = password;
        let mustChangePassword = false;
        if (!finalPassword) {
            // Auto-generate a 12-char secure password if not provided
            finalPassword = node_crypto_1.default.randomBytes(6).toString('hex');
            mustChangePassword = true;
        }
        const passwordHash = await argon2.hash(finalPassword);
        const user = await db_1.prisma.user.create({
            data: {
                email,
                name,
                passwordHash,
                roleId,
                mustChangePassword,
            },
            include: { role: true },
        });
        if (mustChangePassword) {
            Promise.resolve().then(() => __importStar(require('../common/utils/emailService'))).then(({ emailService }) => {
                emailService.sendWelcomeEmail(user.email, finalPassword);
            }).catch(console.error);
        }
        res.status(201).json({ success: true, data: user });
    }
    catch (err) {
        next(err);
    }
};
exports.createUser = createUser;
const updateUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { email, name, roleId } = updateUserSchema.parse(req.body);
        const user = await db_1.prisma.user.update({
            where: { id: id },
            data: {
                email,
                name,
                roleId,
            },
            include: { role: true },
        });
        res.json({ success: true, data: user });
    }
    catch (err) {
        next(err);
    }
};
exports.updateUser = updateUser;
const deleteUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        await db_1.prisma.user.delete({ where: { id: id } });
        res.json({ success: true, message: 'User deleted' });
    }
    catch (err) {
        next(err);
    }
};
exports.deleteUser = deleteUser;
const getAllPermissions = async (req, res, next) => {
    try {
        const permissions = await db_1.prisma.permission.findMany({
            include: {
                resource: {
                    include: { module: true }
                },
                roles: {
                    select: {
                        roleId: true,
                        role: { select: { name: true } }
                    }
                }
            },
            orderBy: [
                { resource: { module: { order: 'asc' } } },
                { resource: { key: 'asc' } },
                { action: 'asc' }
            ]
        });
        res.json({ success: true, data: permissions });
    }
    catch (err) {
        next(err);
    }
};
exports.getAllPermissions = getAllPermissions;
const registerSystemModule = async (req, res, next) => {
    try {
        const data = registerSystemModuleSchema.parse(req.body);
        const module = await db_1.prisma.systemModule.upsert({
            where: { key: data.key },
            update: data,
            create: data,
        });
        res.status(201).json({ success: true, data: module });
    }
    catch (err) {
        next(err);
    }
};
exports.registerSystemModule = registerSystemModule;
const updateSystemModule = async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = registerSystemModuleSchema.parse(req.body);
        const module = await db_1.prisma.systemModule.update({
            where: { id: id },
            data,
        });
        res.json({ success: true, data: module });
    }
    catch (err) {
        next(err);
    }
};
exports.updateSystemModule = updateSystemModule;
const deleteSystemModule = async (req, res, next) => {
    try {
        const { id } = req.params;
        await db_1.prisma.systemModule.delete({ where: { id: id } });
        res.json({ success: true, message: 'Module deleted' });
    }
    catch (err) {
        next(err);
    }
};
exports.deleteSystemModule = deleteSystemModule;
const registerResource = async (req, res, next) => {
    try {
        const data = registerResourceSchema.parse(req.body);
        const module = await db_1.prisma.systemModule.findUnique({ where: { key: data.moduleKey } });
        if (!module)
            return res.status(404).json({ success: false, error: 'Module not found' });
        const resource = await db_1.prisma.resource.upsert({
            where: { moduleId_key: { moduleId: module.id, key: data.key } },
            update: { name: data.name },
            create: { moduleId: module.id, name: data.name, key: data.key },
        });
        res.status(201).json({ success: true, data: resource });
    }
    catch (err) {
        next(err);
    }
};
exports.registerResource = registerResource;
const deleteResource = async (req, res, next) => {
    try {
        const { id } = req.params;
        await db_1.prisma.resource.delete({ where: { id: id } });
        res.json({ success: true, message: 'Resource deleted' });
    }
    catch (err) {
        next(err);
    }
};
exports.deleteResource = deleteResource;
const registerPermission = async (req, res, next) => {
    try {
        const { moduleKey, resourceKey, action, roleIds } = registerPermissionSchema.parse(req.body);
        const resource = await db_1.prisma.resource.findFirst({
            where: { key: resourceKey, module: { key: moduleKey } }
        });
        if (!resource)
            return res.status(404).json({ success: false, error: 'Resource not found in specified module' });
        const perm = await db_1.prisma.permission.upsert({
            where: {
                resourceId_action: {
                    resourceId: resource.id,
                    action,
                },
            },
            update: {},
            create: { resourceId: resource.id, action },
        });
        if (roleIds && roleIds.length > 0) {
            await db_1.prisma.rolePermission.createMany({
                data: roleIds.map(roleId => ({
                    roleId,
                    permissionId: perm.id
                })),
                skipDuplicates: true
            });
        }
        res.status(201).json({ success: true, data: perm });
    }
    catch (err) {
        next(err);
    }
};
exports.registerPermission = registerPermission;
const deletePermission = async (req, res, next) => {
    try {
        const { id } = req.params;
        await db_1.prisma.permission.delete({ where: { id: id } });
        res.json({ success: true, message: 'Permission deleted' });
    }
    catch (err) {
        next(err);
    }
};
exports.deletePermission = deletePermission;
const getSystemModules = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        if (!userId)
            throw new errorHandler_1.AppError(401, 'Unauthorized');
        // Fetch user with roles to check for SuperAdmin
        const user = await db_1.prisma.user.findUnique({
            where: { id: userId },
            include: { role: true }
        });
        if (!user)
            throw new errorHandler_1.AppError(401, 'Unauthorized');
        const isSuperAdmin = user.role?.name === 'SuperAdmin';
        const modules = await db_1.prisma.systemModule.findMany({
            include: {
                resources: {
                    include: {
                        permissions: {
                            include: {
                                roles: {
                                    where: isSuperAdmin ? undefined : {
                                        roleId: user.roleId || 'null'
                                    }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: { order: 'asc' }
        });
        // Filter out modules/resources where user has zero permissions
        const authorizedModules = modules.map(m => {
            const filteredResources = m.resources.map(r => {
                const hasAccess = isSuperAdmin || r.permissions.some(p => p.roles.length > 0);
                return hasAccess ? r : null;
            }).filter(r => r !== null);
            return filteredResources.length > 0 ? { ...m, resources: filteredResources } : null;
        }).filter(m => m !== null);
        res.json({ success: true, data: authorizedModules });
    }
    catch (err) {
        next(err);
    }
};
exports.getSystemModules = getSystemModules;
const getEffectivePermissions = async (req, res, next) => {
    try {
        const userId = req.params.userId;
        const user = await db_1.prisma.user.findUnique({
            where: { id: userId },
            include: {
                role: {
                    include: {
                        permissions: {
                            include: {
                                permission: {
                                    include: { resource: { include: { module: true } } }
                                }
                            }
                        }
                    }
                }
            },
        });
        if (!user)
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
        const permsSet = new Set();
        if (user.role) {
            if (user.role.isSystem && user.role.name === 'SuperAdmin') {
                permsSet.add('*.*.*');
            }
            else {
                for (const rp of user.role.permissions) {
                    const p = rp.permission;
                    permsSet.add(`${p.resource.module.key}.${p.resource.key}.${p.action}`);
                }
            }
        }
        res.json({ success: true, data: Array.from(permsSet) });
    }
    catch (err) {
        next(err);
    }
};
exports.getEffectivePermissions = getEffectivePermissions;
const adminResetPassword = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = await db_1.prisma.user.findUnique({ where: { id: id } });
        if (!user)
            return res.status(404).json({ success: false, error: 'User not found' });
        const resetToken = node_crypto_1.default.randomBytes(32).toString('hex');
        const resetPasswordExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
        await db_1.prisma.user.update({
            where: { id: user.id },
            data: {
                resetPasswordToken: resetToken,
                resetPasswordExpiresAt,
            }
        });
        const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`;
        Promise.resolve().then(() => __importStar(require('../common/utils/emailService'))).then(({ emailService }) => {
            emailService.sendPasswordResetEmail(user.email, resetLink);
        }).catch(console.error);
        res.json({ success: true, message: 'Password reset link sent to user email.' });
    }
    catch (err) {
        next(err);
    }
};
exports.adminResetPassword = adminResetPassword;
