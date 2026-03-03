"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const pino_http_1 = __importDefault(require("pino-http"));
const uuid_1 = require("uuid");
const env_1 = require("./common/config/env");
const logger_1 = require("./common/utils/logger");
const errorHandler_1 = require("./common/middlewares/errorHandler");
// Route imports
const routes_1 = __importDefault(require("./auth/routes"));
const routes_2 = __importDefault(require("./iam/routes"));
const routes_3 = __importDefault(require("./audit/routes"));
const routes_4 = __importDefault(require("./workflow/routes"));
const routes_5 = __importDefault(require("./demo_hr/routes"));
const routes_6 = __importDefault(require("./notifications/routes"));
const routes_7 = __importDefault(require("./logs/routes"));
const app = (0, express_1.default)();
// Security Middlewares
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: env_1.env.FRONTEND_URL,
    credentials: true,
}));
// Parsers
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
// Request ID and Logging
app.use((req, res, next) => {
    req.id = req.headers['x-request-id'] || (0, uuid_1.v4)();
    res.setHeader('X-Request-Id', req.id);
    next();
});
app.use((0, pino_http_1.default)({
    logger: logger_1.logger,
    genReqId: (req) => req.id,
}));
// Modular Routes
const apiRouter = express_1.default.Router();
apiRouter.use('/auth', routes_1.default);
apiRouter.use('/iam', routes_2.default);
apiRouter.use('/audit', routes_3.default);
apiRouter.use('/workflow', routes_4.default);
apiRouter.use('/hr', routes_5.default);
apiRouter.use('/notifications', routes_6.default);
apiRouter.use('/logs', routes_7.default);
app.use('/api', apiRouter);
// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});
// Centralized Error Handling
app.use(errorHandler_1.errorHandler);
exports.default = app;
