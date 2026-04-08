import { Request, Response, NextFunction } from 'express';
import { prisma } from '../common/utils/db';
import { z } from 'zod';
import * as argon2 from 'argon2';
import crypto from 'node:crypto';
import { AppError } from '../common/middlewares/errorHandler';
import { emailService } from '../common/utils/emailService';
import { logger } from '../common/utils/logger';

// Schemas
const createRoleSchema = z.object({
    name: z.string().min(2),
    description: z.string().optional(),
});

const updateRoleSchema = z.object({
    name: z.string().min(2).optional(),
    description: z.string().optional(),
});

const createUserSchema = z.object({
    email: z.string().email(),
    password: z.string()
        .min(8)
        .optional()
        .or(z.literal(''))
        .transform(v => v === '' ? undefined : v),
    name: z.string().optional().transform(v => v === '' ? undefined : v),
    roleId: z.string().optional().transform(v => v === '' ? undefined : v),
    employeeId: z.string().optional().transform(v => v === '' ? undefined : v),
    isActive: z.boolean().optional(),
});

const updateUserSchema = z.object({
    email: z.string().email().optional(),
    name: z.string().optional().transform(v => v === '' ? undefined : v),
    roleId: z.string().optional().transform(v => v === '' ? undefined : v),
    employeeId: z.string().optional().transform(v => v === '' ? undefined : v),
    isActive: z.boolean().optional(),
});

const updateRolePermissionsSchema = z.object({
    permissionIds: z.array(z.string()),
});

const registerSystemModuleSchema = z.object({
    name: z.string().min(2),
    key: z.string().min(2),
    icon: z.string().optional(),
    route: z.string().optional(),
    order: z.number().optional(),
});

const registerResourceSchema = z.object({
    moduleKey: z.string(),
    name: z.string().min(2),
    key: z.string().min(2),
});

const updateResourceSchema = z.object({
    name: z.string().min(2).optional(),
    key: z.string().min(2).optional(),
    moduleKey: z.string().optional(),
});

const registerPermissionSchema = z.object({
    moduleKey: z.string(),
    resourceKey: z.string(),
    action: z.string().min(2),
    roleIds: z.array(z.string()).optional(),
});

export const getRoles = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const roles = await prisma.role.findMany({
            select: {
                id: true,
                name: true,
                description: true,
                isSystem: true,
                createdAt: true,
                permissions: {
                    select: {
                        permission: {
                            select: {
                                id: true,
                                action: true,
                                resource: {
                                    select: {
                                        id: true,
                                        name: true,
                                        key: true,
                                        module: {
                                            select: {
                                                id: true,
                                                name: true,
                                                key: true
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
        });
        res.json({ success: true, data: roles });
    } catch (err) {
        next(err);
    }
};

export const createRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = createRoleSchema.parse(req.body);
        const role = await prisma.role.create({
            data: {
                ...data,
                createdBy: req.user?.userId,
            },
        });
        res.status(201).json({ success: true, data: role });
    } catch (err) {
        next(err);
    }
};

export const updateRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const data = updateRoleSchema.parse(req.body);

        const role = await prisma.role.findUnique({ where: { id: id as string } });
        if (!role) return res.status(404).json({ success: false, error: 'Role not found' });
        if (role.isSystem && data.name && data.name !== role.name) {
            return res.status(400).json({ success: false, error: 'Cannot rename system roles' });
        }

        const updatedRole = await prisma.role.update({
            where: { id: id as string },
            data,
        });
        res.json({ success: true, data: updatedRole });
    } catch (err) {
        next(err);
    }
};

export const deleteRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const role = await prisma.role.findUnique({ where: { id: id as string } });
        if (!role) return res.status(404).json({ success: false, error: 'Role not found' });
        if (role.isSystem) return res.status(400).json({ success: false, error: 'Cannot delete system roles' });

        await prisma.role.delete({ where: { id: id as string } });
        res.json({ success: true, message: 'Role deleted' });
    } catch (err) {
        next(err);
    }
};

export const updateRolePermissions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { permissionIds } = updateRolePermissionsSchema.parse(req.body);

        await prisma.$transaction(async (tx) => {
            await tx.rolePermission.deleteMany({ where: { roleId: id as string } });

            if (permissionIds.length > 0) {
                await tx.rolePermission.createMany({
                    data: permissionIds.map(pId => ({
                        roleId: id as string,
                        permissionId: pId
                    }))
                });
            }
        });

        res.json({ success: true, message: 'Permissions updated' });
    } catch (err) {
        next(err);
    }
};

// Users
export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                isActive: true,
                mfaEnabled: true,
                mustChangePassword: true,
                createdAt: true,
                roleId: true,
                role: { select: { id: true, name: true } },
                employeeId: true,
                employee: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json({ success: true, data: users });
    } catch (err) {
        next(err);
    }
};

export const createUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password, name, roleId, isActive, employeeId } = createUserSchema.parse(req.body);

        let finalPassword = password;
        let mustChangePassword = false;

        if (!finalPassword) {
            // Auto-generate a 12-char secure password if not provided
            finalPassword = crypto.randomBytes(6).toString('hex');
            mustChangePassword = true;
        }

        const passwordHash = await argon2.hash(finalPassword);

        const user = await prisma.$transaction(async (tx) => {
            const newUser = await tx.user.create({
                data: {
                    email,
                    name,
                    passwordHash,
                    roleId,
                    mustChangePassword,
                    isActive: isActive !== undefined ? isActive : true,
                    employeeId: employeeId || null,
                },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    isActive: true,
                    role: { select: { id: true, name: true } },
                    employee: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
                },
            });

            return newUser;
        });

        if (mustChangePassword) {
            emailService.sendWelcomeEmail(user.email, user.name || 'User', finalPassword as string).catch(err => logger.error(err, 'Failed to send welcome email'));
        }

        res.status(201).json({ success: true, data: user });
    } catch (err) {
        next(err);
    }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { email, name, roleId, isActive, employeeId } = updateUserSchema.parse(req.body);

        const user = await prisma.$transaction(async (tx) => {
            const updatedUser = await tx.user.update({
                where: { id: id as string },
                data: {
                    email,
                    name,
                    roleId,
                    isActive,
                    employeeId: employeeId !== undefined ? (employeeId || null) : undefined,
                },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    isActive: true,
                    role: { select: { id: true, name: true } },
                    employee: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
                },
            });

            return updatedUser;
        });

        res.json({ success: true, data: user });
    } catch (err) {
        next(err);
    }
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        await prisma.user.delete({ where: { id: id as string } });
        res.json({ success: true, message: 'User deleted' });
    } catch (err) {
        next(err);
    }
};

export const getAllPermissions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const permissions = await prisma.permission.findMany({
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
    } catch (err) {
        next(err);
    }
};

export const registerSystemModule = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = registerSystemModuleSchema.parse(req.body);
        const module = await prisma.systemModule.upsert({
            where: { key: data.key },
            update: data,
            create: data,
        });
        res.status(201).json({ success: true, data: module });
    } catch (err) {
        next(err);
    }
};

export const updateSystemModule = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const data = registerSystemModuleSchema.parse(req.body);
        const module = await prisma.systemModule.update({
            where: { id: id as string },
            data,
        });
        res.json({ success: true, data: module });
    } catch (err) {
        next(err);
    }
};

export const deleteSystemModule = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        await prisma.systemModule.delete({ where: { id: id as string } });
        res.json({ success: true, message: 'Module deleted' });
    } catch (err) {
        next(err);
    }
};

export const registerResource = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = registerResourceSchema.parse(req.body);
        const module = await prisma.systemModule.findUnique({ where: { key: data.moduleKey } });
        if (!module) return res.status(404).json({ success: false, error: 'Module not found' });

        const resource = await prisma.resource.upsert({
            where: { moduleId_key: { moduleId: module.id, key: data.key } },
            update: { name: data.name },
            create: { moduleId: module.id, name: data.name, key: data.key },
        });
        res.status(201).json({ success: true, data: resource });
    } catch (err) {
        next(err);
    }
};

export const updateResource = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const data = updateResourceSchema.parse(req.body);

        let moduleId: string | undefined;
        if (data.moduleKey) {
            const module = await prisma.systemModule.findUnique({ where: { key: data.moduleKey } });
            if (!module) return res.status(404).json({ success: false, error: 'Module not found' });
            moduleId = module.id;
        }

        const resource = await prisma.resource.update({
            where: { id: id as string },
            data: {
                name: data.name,
                key: data.key,
                moduleId: moduleId,
            },
        });
        res.json({ success: true, data: resource });
    } catch (err) {
        next(err);
    }
};

export const deleteResource = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        await prisma.resource.delete({ where: { id: id as string } });
        res.json({ success: true, message: 'Resource deleted' });
    } catch (err) {
        next(err);
    }
};

export const registerPermission = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { moduleKey, resourceKey, action, roleIds } = registerPermissionSchema.parse(req.body);

        const resource = await prisma.resource.findFirst({
            where: { key: resourceKey, module: { key: moduleKey } }
        });

        if (!resource) return res.status(404).json({ success: false, error: 'Resource not found in specified module' });

        const perm = await prisma.permission.upsert({
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
            await prisma.rolePermission.createMany({
                data: roleIds.map(roleId => ({
                    roleId,
                    permissionId: perm.id
                })),
                skipDuplicates: true
            });
        }

        res.status(201).json({ success: true, data: perm });
    } catch (err) {
        next(err);
    }
};

export const deletePermission = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        await prisma.permission.delete({ where: { id: id as string } });
        res.json({ success: true, message: 'Permission deleted' });
    } catch (err) {
        next(err);
    }
};

export const getSystemModules = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId;
        if (!userId) throw new AppError(401, 'Unauthorized');

        // Fetch user with roles to check for SuperAdmin
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { role: true }
        });

        if (!user) throw new AppError(401, 'Unauthorized');

        const isSuperAdmin = user.role?.name === 'SuperAdmin';

        const modules = await prisma.systemModule.findMany({
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
    } catch (err) {
        next(err);
    }
};

export const getEffectivePermissions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.params.userId;
        const user = await prisma.user.findUnique({
            where: { id: userId as string },
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

        if (!user) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });

        const permsSet = new Set<string>();

        if (user.role) {
            if (user.role.isSystem && user.role.name === 'SuperAdmin') {
                permsSet.add('*.*.*');
            } else {
                for (const rp of user.role.permissions) {
                    const p = rp.permission;
                    permsSet.add(`${p.resource.module.key}.${p.resource.key}.${p.action}`);
                }
            }
        }

        res.json({ success: true, data: Array.from(permsSet) });
    } catch (err) {
        next(err);
    }
};

export const adminResetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const user = await prisma.user.findUnique({ where: { id: id as string } });
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });

        // Generate raw token for the email link, store only the SHA-256 hash in the DB
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
        const resetPasswordExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetPasswordToken: resetTokenHash,
                resetPasswordExpiresAt,
            } as any
        });

        const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`;

        import('../common/utils/emailService').then(({ emailService }) => {
            emailService.sendPasswordResetEmail(user.email, resetLink);
        }).catch(console.error);

        res.json({ success: true, message: 'Password reset link sent to user email.' });
    } catch (err) {
        next(err);
    }
};
