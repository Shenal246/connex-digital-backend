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
Object.defineProperty(exports, "__esModule", { value: true });
exports.employeeService = exports.EmployeeService = void 0;
const db_1 = require("../../common/utils/db");
const errorHandler_1 = require("../../common/middlewares/errorHandler");
const argon2 = __importStar(require("argon2"));
class EmployeeService {
    async createEmployee(data) {
        return await db_1.prisma.$transaction(async (tx) => {
            // 1. Create Employee
            const employee = await tx.employee.create({
                data: {
                    employeeId: data.employeeId,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    middleName: data.middleName,
                    displayName: data.displayName,
                    gender: data.gender,
                    dateOfBirth: new Date(data.dateOfBirth),
                    maritalStatus: data.maritalStatus,
                    bloodGroup: data.bloodGroup,
                    joinDate: new Date(data.joinDate),
                    status: data.status || 'PROBATION',
                    departmentId: data.departmentId,
                    designationId: data.designationId,
                    reportsToId: data.reportsToId,
                    // Nested creates
                    addresses: {
                        create: data.addresses || [],
                    },
                    emergencyContacts: {
                        create: data.emergencyContacts || [],
                    },
                    bankDetails: data.bankDetails ? {
                        create: data.bankDetails,
                    } : undefined,
                },
                include: {
                    department: true,
                    designation: true,
                    addresses: true,
                    bankDetails: true,
                    emergencyContacts: true,
                }
            });
            // 2. record initial history
            await tx.employmentHistory.create({
                data: {
                    employeeId: employee.id,
                    departmentId: employee.departmentId,
                    designationId: employee.designationId,
                    startDate: employee.joinDate,
                    changeReason: 'INITIAL_APPOINTMENT',
                }
            });
            // 3. Create User account if requested
            if (data.createAccount && data.accountEmail) {
                const passwordHash = await argon2.hash(data.accountPassword || 'Welcome123!');
                await tx.user.create({
                    data: {
                        email: data.accountEmail,
                        name: `${employee.firstName} ${employee.lastName}`,
                        passwordHash: passwordHash,
                        roleId: data.roleId || null,
                        employeeId: employee.id,
                        isActive: true,
                        mustChangePassword: true
                    }
                });
            }
            return employee;
        });
    }
    async getEmployees(filters = {}) {
        const { search, departmentId, status } = filters;
        return await db_1.prisma.employee.findMany({
            where: {
                AND: [
                    search ? {
                        OR: [
                            { firstName: { contains: search, mode: 'insensitive' } },
                            { lastName: { contains: search, mode: 'insensitive' } },
                            { employeeId: { contains: search, mode: 'insensitive' } },
                        ]
                    } : {},
                    departmentId ? { departmentId } : {},
                    status ? { status: status } : {},
                ]
            },
            include: {
                department: { select: { name: true } },
                designation: { select: { name: true } },
                user: { select: { email: true, isActive: true, role: { select: { name: true } } } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getEmployeeById(id) {
        const employee = await db_1.prisma.employee.findUnique({
            where: { id },
            include: {
                department: true,
                designation: true,
                addresses: true,
                bankDetails: true,
                emergencyContacts: true,
                history: {
                    include: {
                        department: { select: { name: true } },
                        designation: { select: { name: true } },
                    },
                    orderBy: { startDate: 'desc' },
                },
                documents: true,
                reportsTo: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        designation: { select: { name: true } }
                    }
                },
                user: {
                    include: {
                        role: true
                    }
                }
            }
        });
        if (!employee)
            throw new errorHandler_1.AppError(404, 'Employee not found');
        return employee;
    }
    async updateEmployee(id, data) {
        return await db_1.prisma.employee.update({
            where: { id },
            data,
            include: {
                department: true,
                designation: true,
            }
        });
    }
    async deleteEmployee(id) {
        return await db_1.prisma.employee.delete({ where: { id } });
    }
    async getHierarchy() {
        const employees = await db_1.prisma.employee.findMany({
            include: {
                designation: { select: { name: true } },
                department: { select: { name: true } }
            }
        });
        const idMap = {};
        employees.forEach(emp => {
            idMap[emp.id] = { ...emp, children: [] };
        });
        const tree = [];
        employees.forEach(emp => {
            if (emp.reportsToId && idMap[emp.reportsToId]) {
                idMap[emp.reportsToId].children.push(idMap[emp.id]);
            }
            else {
                tree.push(idMap[emp.id]);
            }
        });
        return tree;
    }
}
exports.EmployeeService = EmployeeService;
exports.employeeService = new EmployeeService();
