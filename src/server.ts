import app from './app';
import { env } from './common/config/env';
import { logger } from './common/utils/logger';

const startServer = async () => {
    try {
        app.listen(env.PORT, () => {
            logger.info(`Server is running on port ${env.PORT} in ${env.NODE_ENV} mode`);
        });
    } catch (error) {
        logger.error(error, 'Failed to start server');
        process.exit(1);
    }
};

startServer();
