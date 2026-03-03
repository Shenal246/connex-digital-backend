"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirePermission = void 0;
const errorHandler_1 = require("../common/middlewares/errorHandler");
const db_1 = require("../common/utils/db");
const requirePermission = (moduleKey, resourceKey, action) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                throw new errorHandler_1.AppError(401, 'Unauthorized');
            }
            const userId = req.user.userId;
            // Fetch user role and its permissions
            const user = await db_1.prisma.user.findUnique({
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
            if (!user)
                throw new errorHandler_1.AppError(401, 'Unauthorized');
            let hasPermission = false;
            // Evaluate effective permissions including wildcards
            if (user.role) {
                // System roles (like SuperAdmin) might have special handling
                if (user.role.isSystem && user.role.name === 'SuperAdmin') {
                    hasPermission = true;
                }
                else {
                    for (const rp of user.role.permissions) {
                        const p = rp.permission;
                        if (!p.resource)
                            continue;
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
                throw new errorHandler_1.AppError(403, `Forbidden: Missing required permission ${moduleKey}.${resourceKey}.${action}`);
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.requirePermission = requirePermission;
