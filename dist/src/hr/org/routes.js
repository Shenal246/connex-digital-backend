"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controller_1 = require("./controller");
const router = (0, express_1.Router)();
// Department Routes
router.post('/departments', controller_1.orgController.createDepartment);
router.get('/departments', controller_1.orgController.getDepartments);
router.patch('/departments/:id', controller_1.orgController.updateDepartment);
router.delete('/departments/:id', controller_1.orgController.deleteDepartment);
// Designation Routes
router.post('/designations', controller_1.orgController.createDesignation);
router.get('/designations', controller_1.orgController.getDesignations);
router.patch('/designations/:id', controller_1.orgController.updateDesignation);
router.delete('/designations/:id', controller_1.orgController.deleteDesignation);
exports.default = router;
