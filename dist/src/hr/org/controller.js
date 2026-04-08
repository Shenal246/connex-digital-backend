"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orgController = exports.OrgController = void 0;
const service_1 = require("./service");
class OrgController {
    // Department Endpoints
    async createDepartment(req, res, next) {
        try {
            const dept = await service_1.orgService.createDepartment(req.body);
            res.status(201).json(dept);
        }
        catch (error) {
            next(error);
        }
    }
    async getDepartments(req, res, next) {
        try {
            const depts = await service_1.orgService.getDepartments();
            res.status(200).json(depts);
        }
        catch (error) {
            next(error);
        }
    }
    async updateDepartment(req, res, next) {
        try {
            const dept = await service_1.orgService.updateDepartment(req.params.id, req.body);
            res.status(200).json(dept);
        }
        catch (error) {
            next(error);
        }
    }
    async deleteDepartment(req, res, next) {
        try {
            await service_1.orgService.deleteDepartment(req.params.id);
            res.status(204).send();
        }
        catch (error) {
            next(error);
        }
    }
    // Designation Endpoints
    async createDesignation(req, res, next) {
        try {
            const desig = await service_1.orgService.createDesignation(req.body);
            res.status(201).json(desig);
        }
        catch (error) {
            next(error);
        }
    }
    async getDesignations(req, res, next) {
        try {
            const desigs = await service_1.orgService.getDesignations(req.query.departmentId);
            res.status(200).json(desigs);
        }
        catch (error) {
            next(error);
        }
    }
    async updateDesignation(req, res, next) {
        try {
            const desig = await service_1.orgService.updateDesignation(req.params.id, req.body);
            res.status(200).json(desig);
        }
        catch (error) {
            next(error);
        }
    }
    async deleteDesignation(req, res, next) {
        try {
            await service_1.orgService.deleteDesignation(req.params.id);
            res.status(204).send();
        }
        catch (error) {
            next(error);
        }
    }
}
exports.OrgController = OrgController;
exports.orgController = new OrgController();
