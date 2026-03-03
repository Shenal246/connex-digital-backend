"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const env_1 = require("./common/config/env");
const logger_1 = require("./common/utils/logger");
const startServer = async () => {
    try {
        app_1.default.listen(env_1.env.PORT, () => {
            logger_1.logger.info(`Server is running on port ${env_1.env.PORT} in ${env_1.env.NODE_ENV} mode`);
        });
    }
    catch (error) {
        logger_1.logger.error(error, 'Failed to start server');
        process.exit(1);
    }
};
startServer();
