import { prisma } from '../../common/utils/db';
import { AppError } from '../../common/middlewares/errorHandler';
import { EmployeeStatus, Gender } from '@prisma/client';
import * as argon2 from 'argon2';

export class EmployeeService {
    async createEmployee(data: any) {
        return await prisma.$transaction(async (tx) => {
            // 1. Create Employee
            const employee = await tx.employee.create({
                data: {
                    employeeId: data.employeeId,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    middleName: data.middleName,
                    displayName: data.displayName,
                    gender: data.gender as Gender,
                    dateOfBirth: new Date(data.dateOfBirth),
                    maritalStatus: data.maritalStatus,
                    bloodGroup: data.bloodGroup,
                    joinDate: new Date(data.joinDate),
                    status: data.status as EmployeeStatus || 'PROBATION',
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

    async getEmployees(filters: any = {}) {
        const { search, departmentId, status } = filters;
        return await prisma.employee.findMany({
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
                    status ? { status: status as EmployeeStatus } : {},
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

    async getEmployeeById(id: string) {
        const employee = await prisma.employee.findUnique({
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
                    select: {
                        id: true,
                        email: true,
                        isActive: true,
                        role: { select: { id: true, name: true } }
                    }
                }
            }
        });

        if (!employee) throw new AppError(404, 'Employee not found');
        return employee;
    }

    async updateEmployee(id: string, data: any) {
        return await prisma.employee.update({
            where: { id },
            data,
            include: {
                department: true,
                designation: true,
            }
        });
    }

    async deleteEmployee(id: string) {
        return await prisma.employee.delete({ where: { id } });
    }

    async getHierarchy() {
        const employees = await prisma.employee.findMany({
            include: {
                designation: { select: { name: true } },
                department: { select: { name: true } }
            }
        });

        const idMap: Record<string, any> = {};
        employees.forEach(emp => {
            idMap[emp.id] = { ...emp, children: [] };
        });

        const tree: any[] = [];
        employees.forEach(emp => {
            if (emp.reportsToId && idMap[emp.reportsToId]) {
                idMap[emp.reportsToId].children.push(idMap[emp.id]);
            } else {
                tree.push(idMap[emp.id]);
            }
        });

        return tree;
    }
}

export const employeeService = new EmployeeService();
