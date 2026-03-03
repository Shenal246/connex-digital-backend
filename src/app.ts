import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { v4 as uuidv4 } from 'uuid';
import { env } from './common/config/env';
import { logger } from './common/utils/logger';
import { errorHandler } from './common/middlewares/errorHandler';

// Route imports
import authRoutes from './auth/routes';
import iamRoutes from './iam/routes';
import auditRoutes from './audit/routes';
import workflowRoutes from './workflow/routes';
import demoHrRoutes from './demo_hr/routes';
import notificationRoutes from './notifications/routes';
import logsRoutes from './logs/routes';
import settingsRoutes from './settings/routes';
import helpRoutes from './help/routes';

const app = express();

// Security Middlewares
app.use(helmet());
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

// Modular Routes
const apiRouter = express.Router();
apiRouter.use('/auth', authRoutes);
apiRouter.use('/iam', iamRoutes);
apiRouter.use('/audit', auditRoutes);
apiRouter.use('/workflow', workflowRoutes);
apiRouter.use('/hr', demoHrRoutes);
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
