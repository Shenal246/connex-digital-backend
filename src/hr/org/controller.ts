import { Request, Response, NextFunction } from 'express';
import { orgService } from './service';

export class OrgController {
    // Department Endpoints
    async createDepartment(req: Request, res: Response, next: NextFunction) {
        try {
            const dept = await orgService.createDepartment(req.body);
            res.status(201).json(dept);
        } catch (error) {
            next(error);
        }
    }

    async getDepartments(req: Request, res: Response, next: NextFunction) {
        try {
            const depts = await orgService.getDepartments();
            res.status(200).json(depts);
        } catch (error) {
            next(error);
        }
    }

    async updateDepartment(req: Request, res: Response, next: NextFunction) {
        try {
            const dept = await orgService.updateDepartment(req.params.id as string, req.body);
            res.status(200).json(dept);
        } catch (error) {
            next(error);
        }
    }

    async deleteDepartment(req: Request, res: Response, next: NextFunction) {
        try {
            await orgService.deleteDepartment(req.params.id as string);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }

    // Designation Endpoints
    async createDesignation(req: Request, res: Response, next: NextFunction) {
        try {
            const desig = await orgService.createDesignation(req.body);
            res.status(201).json(desig);
        } catch (error) {
            next(error);
        }
    }

    async getDesignations(req: Request, res: Response, next: NextFunction) {
        try {
            const desigs = await orgService.getDesignations(req.query.departmentId as string);
            res.status(200).json(desigs);
        } catch (error) {
            next(error);
        }
    }

    async updateDesignation(req: Request, res: Response, next: NextFunction) {
        try {
            const desig = await orgService.updateDesignation(req.params.id as string, req.body);
            res.status(200).json(desig);
        } catch (error) {
            next(error);
        }
    }

    async deleteDesignation(req: Request, res: Response, next: NextFunction) {
        try {
            await orgService.deleteDesignation(req.params.id as string);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }
}

export const orgController = new OrgController();
