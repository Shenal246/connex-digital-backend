import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { v4 as uuidv4 } from 'uuid';
import { env } from './common/config/env';
import { logger } from './common/utils/logger';
import { errorHandler } from './common/middlewares/errorHandler';
import { apiKey } from './common/middlewares/apiKey';

// Route imports
import authRoutes from './auth/routes';
import iamRoutes from './iam/routes';
import auditRoutes from './audit/routes';
import notificationRoutes from './notifications/routes';
import logsRoutes from './logs/routes';
import settingsRoutes from './settings/routes';
import helpRoutes from './help/routes';
import hrRoutes from './hr/routes';

const app = express();

// Trust first proxy (NGINX / load balancer) for correct client IP in rate limiting
app.set('trust proxy', 1);

// Security Middlewares
app.use(helmet());

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
    standardHeaders: 'draft-7', // set `RateLimit` and `RateLimit-Policy` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
    message: {
        status: 'error',
        message: 'Too many requests from this IP, please try again after 15 minutes',
    },
});
app.use(limiter);

app.use(
    cors({
        origin: env.FRONTEND_URL,
        credentials: true,
    })
);

// Parsers
app.use(express.json());
app.use(cookieParser());

// Request ID and Logging
app.use((req, res, next) => {
    req.id = req.headers['x-request-id'] || uuidv4();
    res.setHeader('X-Request-Id', req.id as string);
    next();
});

app.use(
    pinoHttp({
        logger,
        genReqId: (req) => req.id,
    })
);

import { signatureMiddleware } from './common/middlewares/signatureMiddleware';

// Modular Routes
const apiRouter = express.Router();
apiRouter.use(apiKey);
apiRouter.use(signatureMiddleware);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/iam', iamRoutes);
apiRouter.use('/audit', auditRoutes);
apiRouter.use('/hr', hrRoutes);
apiRouter.use('/notifications', notificationRoutes);
apiRouter.use('/logs', logsRoutes);
apiRouter.use('/settings', settingsRoutes);
apiRouter.use('/help', helpRoutes);

app.use('/api', apiRouter);

// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// Centralized Error Handling
app.use(errorHandler);

export default app;
