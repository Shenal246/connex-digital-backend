import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { workflowService } from './service';

const createDraftSchema = z.object({
    triggerEvent: z.string(),
    definitionJson: z.any(),
});

export const createDraft = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = createDraftSchema.parse(req.body);
        const draft = await workflowService.createDraft(data.triggerEvent, data.definitionJson);
        res.status(201).json({ success: true, data: draft });
    } catch (err) {
        next(err);
    }
};

export const getDefinitions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const drafts = await workflowService.getDefinitions();
        res.json({ success: true, data: drafts });
    } catch (err) {
        next(err);
    }
};

export const MathPublishWorkflow = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const published = await workflowService.publishWorkflow(id as string);
        res.json({ success: true, data: published });
    } catch (err) {
        next(err);
    }
};

export const getMyTasks = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) return res.status(401).send();
        const tasks = await workflowService.getMyTasks(req.user.userId);
        res.json({ success: true, data: tasks });
    } catch (err) {
        next(err);
    }
};

const actionTaskSchema = z.object({
    action: z.enum(['APPROVE', 'REJECT', 'AMEND']),
    comments: z.string().optional(),
});

export const actionTask = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) return res.status(401).send();
        const { id } = req.params;
        const { action, comments } = actionTaskSchema.parse(req.body);

        const result = await workflowService.actionTask(id as string, req.user.userId, action, comments);
        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};
