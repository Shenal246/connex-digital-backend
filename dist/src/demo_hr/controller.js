"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listRequisitions = exports.getRequisition = exports.createRequisition = void 0;
const zod_1 = require("zod");
const service_1 = require("./service");
const createRequisitionSchema = zod_1.z.object({
    title: zod_1.z.string(),
    division: zod_1.z.string(),
    justification: zod_1.z.string(),
    requestedPositions: zod_1.z.number().int().min(1),
});
const createRequisition = async (req, res, next) => {
    try {
        const data = createRequisitionSchema.parse(req.body);
        if (!req.user)
            return res.status(401).send();
        const reqn = await service_1.requisitionService.createRequisition(req.user.userId, data);
        res.status(201).json({ success: true, data: reqn });
    }
    catch (err) {
        next(err);
    }
};
exports.createRequisition = createRequisition;
const getRequisition = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await service_1.requisitionService.getRequisition(id);
        res.json({ success: true, data: result });
    }
    catch (err) {
        next(err);
    }
};
exports.getRequisition = getRequisition;
const listRequisitions = async (req, res, next) => {
    try {
        const list = await service_1.requisitionService.listRequisitions();
        res.json({ success: true, data: list });
    }
    catch (err) {
        next(err);
    }
};
exports.listRequisitions = listRequisitions;
