import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requisitionService } from './service';

const createRequisitionSchema = z.object({
    title: z.string(),
    division: z.string(),
    justification: z.string(),
    requestedPositions: z.number().int().min(1),
});

export const createRequisition = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = createRequisitionSchema.parse(req.body);
        if (!req.user) return res.status(401).send();

        const reqn = await requisitionService.createRequisition(req.user.userId, data);
        res.status(201).json({ success: true, data: reqn });
    } catch (err) {
        next(err);
    }
};

export const getRequisition = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const result = await requisitionService.getRequisition(id as string);
        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};

export const listRequisitions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const list = await requisitionService.listRequisitions();
        res.json({ success: true, data: list });
    } catch (err) {
        next(err);
    }
};
