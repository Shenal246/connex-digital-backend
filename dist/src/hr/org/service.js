"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orgService = exports.OrgService = void 0;
const db_1 = require("../../common/utils/db");
const errorHandler_1 = require("../../common/middlewares/errorHandler");
class OrgService {
    // Departments
    async createDepartment(data) {
        return await db_1.prisma.department.create({
            data: {
                name: data.name,
                description: data.description,
                managerId: data.managerId,
            },
        });
    }
    async getDepartments() {
        return await db_1.prisma.department.findMany({
            include: {
                _count: { select: { employees: true, designations: true } },
            },
            orderBy: { name: 'asc' },
        });
    }
    async updateDepartment(id, data) {
        const { parentDeptId, ...updateData } = data;
        return await db_1.prisma.department.update({
            where: { id },
            data: updateData,
        });
    }
    async deleteDepartment(id) {
        const count = await db_1.prisma.employee.count({ where: { departmentId: id } });
        if (count > 0)
            throw new errorHandler_1.AppError(400, 'Cannot delete department with active employees');
        return await db_1.prisma.department.delete({ where: { id } });
    }
    // Designations
    async createDesignation(data) {
        return await db_1.prisma.designation.create({
            data: {
                name: data.name,
                description: data.description,
                departmentId: data.departmentId,
            },
        });
    }
    async getDesignations(departmentId) {
        return await db_1.prisma.designation.findMany({
            where: departmentId ? { departmentId } : {},
            include: {
                department: { select: { name: true } },
                _count: { select: { employees: true } },
            },
            orderBy: { name: 'asc' },
        });
    }
    async updateDesignation(id, data) {
        return await db_1.prisma.designation.update({
            where: { id },
            data,
        });
    }
    async deleteDesignation(id) {
        const count = await db_1.prisma.employee.count({ where: { designationId: id } });
        if (count > 0)
            throw new errorHandler_1.AppError(400, 'Cannot delete designation assigned to employees');
        return await db_1.prisma.designation.delete({ where: { id } });
    }
}
exports.OrgService = OrgService;
exports.orgService = new OrgService();
