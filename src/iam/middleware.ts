import { Request, Response, NextFunction } from 'express';
import { AppError } from '../common/middlewares/errorHandler';
import { prisma } from '../common/utils/db';

export const requirePermission = (moduleKey: string, resourceKey: string, action: string) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!req.user) {
                throw new AppError(401, 'Unauthorized');
            }

            const userId = req.user.userId;

            // Fetch user role and its permissions
            const user = await prisma.user.findUnique({
                where: { id: userId },
                include: {
                    role: {
                        include: {
                            permissions: {
                                include: {
                                    permission: {
                                        include: {
                                            resource: {
                                                include: {
                                                    module: true
                                                }
                                            }
                                        }
                                    },
                                },
                            },
                        },
                    },
                },
            });

            if (!user) throw new AppError(401, 'Unauthorized');

            let hasPermission = false;

            // Evaluate effective permissions including wildcards
            if (user.role) {
                // System roles (like SuperAdmin) might have special handling
                if (user.role.isSystem && user.role.name === 'SuperAdmin') {
                    hasPermission = true;
                } else {
                    for (const rp of user.role.permissions) {
                        const p = rp.permission;

                        if (!p.resource) continue;

                        const matchModule = p.resource.module.key === '*' || p.resource.module.key === moduleKey;
                        const matchResource = p.resource.key === '*' || p.resource.key === resourceKey;
                        const matchAction = p.action === '*' || p.action === action;

                        if (matchModule && matchResource && matchAction) {
                            hasPermission = true;
                            break;
                        }
                    }
                }
            }

            if (!hasPermission) {
                throw new AppError(403, `Forbidden: Missing required permission ${moduleKey}.${resourceKey}.${action}`);
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};
