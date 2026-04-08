"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.employeeController = exports.EmployeeController = void 0;
const service_1 = require("./service");
class EmployeeController {
    async createEmployee(req, res, next) {
        try {
            const employee = await service_1.employeeService.createEmployee(req.body);
            res.status(201).json(employee);
        }
        catch (error) {
            next(error);
        }
    }
    async getEmployees(req, res, next) {
        try {
            const filters = {
                search: req.query.search,
                departmentId: req.query.departmentId,
                status: req.query.status,
            };
            const employees = await service_1.employeeService.getEmployees(filters);
            res.status(200).json(employees);
        }
        catch (error) {
            next(error);
        }
    }
    async getHierarchy(req, res, next) {
        try {
            const hierarchy = await service_1.employeeService.getHierarchy();
            res.status(200).json(hierarchy);
        }
        catch (error) {
            next(error);
        }
    }
    async getEmployeeById(req, res, next) {
        try {
            const employee = await service_1.employeeService.getEmployeeById(req.params.id);
            res.status(200).json(employee);
        }
        catch (error) {
            next(error);
        }
    }
    async updateEmployee(req, res, next) {
        try {
            const employee = await service_1.employeeService.updateEmployee(req.params.id, req.body);
            res.status(200).json(employee);
        }
        catch (error) {
            next(error);
        }
    }
    async deleteEmployee(req, res, next) {
        try {
            await service_1.employeeService.deleteEmployee(req.params.id);
            res.status(204).send();
        }
        catch (error) {
            next(error);
        }
    }
}
exports.EmployeeController = EmployeeController;
exports.employeeController = new EmployeeController();
