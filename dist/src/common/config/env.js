"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const zod_1 = require("zod");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    PORT: zod_1.z.string().default('5000'),
    DATABASE_URL: zod_1.z.string(),
    JWT_SECRET: zod_1.z.string(),
    JWT_REFRESH_SECRET: zod_1.z.string(),
    REDIS_URL: zod_1.z.string().default('redis://localhost:6379'),
    FRONTEND_URL: zod_1.z.string().default('http://localhost:3000'),
    SMTP_HOST: zod_1.z.string(),
    SMTP_PORT: zod_1.z.string(),
    SMTP_USER: zod_1.z.string(),
    SMTP_PASS: zod_1.z.string(),
    SMTP_FROM: zod_1.z.string(),
});
const _env = envSchema.safeParse(process.env);
if (!_env.success) {
    console.error('Invalid environment variables:', _env.error.format());
    process.exit(1);
}
exports.env = _env.data;
