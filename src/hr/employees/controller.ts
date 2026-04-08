import { Request, Response, NextFunction } from 'express';
import { employeeService } from './service';

export class EmployeeController {
    async createEmployee(req: Request, res: Response, next: NextFunction) {
        try {
            const employee = await employeeService.createEmployee(req.body);
            res.status(201).json(employee);
        } catch (error) {
            next(error);
        }
    }

    async getEmployees(req: Request, res: Response, next: NextFunction) {
        try {
            const filters = {
                search: req.query.search as string,
                departmentId: req.query.departmentId as string,
                status: req.query.status as string,
            };
            const employees = await employeeService.getEmployees(filters);
            res.status(200).json(employees);
        } catch (error) {
            next(error);
        }
    }

    async getHierarchy(req: Request, res: Response, next: NextFunction) {
        try {
            const hierarchy = await employeeService.getHierarchy();
            res.status(200).json(hierarchy);
        } catch (error) {
            next(error);
        }
    }

    async getEmployeeById(req: Request, res: Response, next: NextFunction) {
        try {
            const employee = await employeeService.getEmployeeById(req.params.id as string);
            res.status(200).json(employee);
        } catch (error) {
            next(error);
        }
    }

    async updateEmployee(req: Request, res: Response, next: NextFunction) {
        try {
            const employee = await employeeService.updateEmployee(req.params.id as string, req.body);
            res.status(200).json(employee);
        } catch (error) {
            next(error);
        }
    }

    async deleteEmployee(req: Request, res: Response, next: NextFunction) {
        try {
            await employeeService.deleteEmployee(req.params.id as string);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }
}

export const employeeController = new EmployeeController();
