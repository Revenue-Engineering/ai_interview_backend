// Main entry point for the recruitment platform
// Following performance best practices with proper startup and shutdown handling

import app from './app';
import logger from '@/utils/logger';

// Performance: Async/await prevents event loop blocking during startup
async function startServer(): Promise<void> {
    try {
        logger.info('Starting recruitment platform server...');

        const port = parseInt(process.env.PORT || '3000');
        await app.start(port);

        logger.info('Server started successfully', {
            port,
            environment: process.env.NODE_ENV,
            nodeVersion: process.version,
        });
    } catch (error) {
        logger.error('Failed to start server', { error });
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM signal, shutting down gracefully...');
    await app.shutdown();
});

process.on('SIGINT', async () => {
    logger.info('Received SIGINT signal, shutting down gracefully...');
    await app.shutdown();
});

// Start the server
startServer(); 