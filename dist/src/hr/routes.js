"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const routes_1 = __importDefault(require("./org/routes"));
const routes_2 = __importDefault(require("./employees/routes"));
const router = (0, express_1.Router)();
router.use('/org', routes_1.default);
router.use('/employees', routes_2.default);
exports.default = router;
