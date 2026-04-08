import { prisma } from '../../common/utils/db';
import { AppError } from '../../common/middlewares/errorHandler';

export class OrgService {
    // Departments
    async createDepartment(data: { name: string; description?: string; managerId?: string }) {
        return await prisma.department.create({
            data: {
                name: data.name,
                description: data.description,
                managerId: data.managerId,
            },
        });
    }

    async getDepartments() {
        return await prisma.department.findMany({
            include: {
                _count: { select: { employees: true, designations: true } },
            },
            orderBy: { name: 'asc' },
        });
    }

    async updateDepartment(id: string, data: any) {
        const { parentDeptId, ...updateData } = data;
        return await prisma.department.update({
            where: { id },
            data: updateData,
        });
    }

    async deleteDepartment(id: string) {
        const count = await prisma.employee.count({ where: { departmentId: id } });
        if (count > 0) throw new AppError(400, 'Cannot delete department with active employees');
        return await prisma.department.delete({ where: { id } });
    }

    // Designations
    async createDesignation(data: { name: string; description?: string; departmentId: string }) {
        return await prisma.designation.create({
            data: {
                name: data.name,
                description: data.description,
                departmentId: data.departmentId,
            },
        });
    }

    async getDesignations(departmentId?: string) {
        return await prisma.designation.findMany({
            where: departmentId ? { departmentId } : {},
            include: {
                department: { select: { name: true } },
                _count: { select: { employees: true } },
            },
            orderBy: { name: 'asc' },
        });
    }

    async updateDesignation(id: string, data: any) {
        return await prisma.designation.update({
            where: { id },
            data,
        });
    }

    async deleteDesignation(id: string) {
        const count = await prisma.employee.count({ where: { designationId: id } });
        if (count > 0) throw new AppError(400, 'Cannot delete designation assigned to employees');
        return await prisma.designation.delete({ where: { id } });
    }
}

export const orgService = new OrgService();
