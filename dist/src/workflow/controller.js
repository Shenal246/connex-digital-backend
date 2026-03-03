"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.actionTask = exports.getMyTasks = exports.MathPublishWorkflow = exports.getDefinitions = exports.createDraft = void 0;
const zod_1 = require("zod");
const service_1 = require("./service");
const createDraftSchema = zod_1.z.object({
    triggerEvent: zod_1.z.string(),
    definitionJson: zod_1.z.any(),
});
const createDraft = async (req, res, next) => {
    try {
        const data = createDraftSchema.parse(req.body);
        const draft = await service_1.workflowService.createDraft(data.triggerEvent, data.definitionJson);
        res.status(201).json({ success: true, data: draft });
    }
    catch (err) {
        next(err);
    }
};
exports.createDraft = createDraft;
const getDefinitions = async (req, res, next) => {
    try {
        const drafts = await service_1.workflowService.getDefinitions();
        res.json({ success: true, data: drafts });
    }
    catch (err) {
        next(err);
    }
};
exports.getDefinitions = getDefinitions;
const MathPublishWorkflow = async (req, res, next) => {
    try {
        const { id } = req.params;
        const published = await service_1.workflowService.publishWorkflow(id);
        res.json({ success: true, data: published });
    }
    catch (err) {
        next(err);
    }
};
exports.MathPublishWorkflow = MathPublishWorkflow;
const getMyTasks = async (req, res, next) => {
    try {
        if (!req.user)
            return res.status(401).send();
        const tasks = await service_1.workflowService.getMyTasks(req.user.userId);
        res.json({ success: true, data: tasks });
    }
    catch (err) {
        next(err);
    }
};
exports.getMyTasks = getMyTasks;
const actionTaskSchema = zod_1.z.object({
    action: zod_1.z.enum(['APPROVE', 'REJECT', 'AMEND']),
    comments: zod_1.z.string().optional(),
});
const actionTask = async (req, res, next) => {
    try {
        if (!req.user)
            return res.status(401).send();
        const { id } = req.params;
        const { action, comments } = actionTaskSchema.parse(req.body);
        const result = await service_1.workflowService.actionTask(id, req.user.userId, action, comments);
        res.json({ success: true, data: result });
    }
    catch (err) {
        next(err);
    }
};
exports.actionTask = actionTask;
