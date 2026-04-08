"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controller_1 = require("./controller");
const auth_1 = require("../common/middlewares/auth");
const router = (0, express_1.Router)();
// All settings routes require authentication
router.use(auth_1.requireAuth);
router.patch('/profile', controller_1.updateProfileController);
router.post('/request-password-change', controller_1.requestPasswordChangeController);
router.post('/change-password', controller_1.changePasswordController);
router.post('/mfa/setup', controller_1.setupMfaController);
router.post('/mfa/enable', controller_1.enableMfaController);
router.post('/mfa/disable', controller_1.disableMfaController);
exports.default = router;
