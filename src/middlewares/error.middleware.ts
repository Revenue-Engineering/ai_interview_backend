// Centralized error handling middleware
// Following monitoring best practices with structured error logging

import { Request, Response, NextFunction } from 'express';
import logger from '@/utils/logger';

// Custom error classes for different types of errors
export class AppError extends Error {
    public statusCode: number;
    public isOperational: boolean;

    constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;

        Error.captureStackTrace(this, this.constructor);
    }
}

export class ValidationError extends AppError {
    constructor(message: string) {
        super(message, 400);
    }
}

export class AuthenticationError extends AppError {
    constructor(message: string = 'Authentication failed') {
        super(message, 401);
    }
}

export class AuthorizationError extends AppError {
    constructor(message: string = 'Access denied') {
        super(message, 403);
    }
}

export class NotFoundError extends AppError {
    constructor(message: string = 'Resource not found') {
        super(message, 404);
    }
}

export class ConflictError extends AppError {
    constructor(message: string = 'Resource conflict') {
        super(message, 409);
    }
}

export class RateLimitError extends AppError {
    constructor(message: string = 'Rate limit exceeded') {
        super(message, 429);
    }
}

// Error handling middleware
export class ErrorMiddleware {
    /**
     * Centralized error handler middleware
     * Monitoring: Structured error logging enables better issue detection
     */
    public static errorHandler(
        error: Error | AppError,
        req: Request,
        res: Response,
        next: NextFunction
    ): void {
        let statusCode = 500;
        let message = 'Internal server error';
        let isOperational = false;

        // Handle custom app errors
        if (error instanceof AppError) {
            statusCode = error.statusCode;
            message = error.message;
            isOperational = error.isOperational;
        } else if (error.name === 'ValidationError') {
            statusCode = 400;
            message = 'Validation error';
        } else if (error.name === 'CastError') {
            statusCode = 400;
            message = 'Invalid ID format';
        } else if (error.name === 'JsonWebTokenError') {
            statusCode = 401;
            message = 'Invalid token';
        } else if (error.name === 'TokenExpiredError') {
            statusCode = 401;
            message = 'Token expired';
        } else if (error.name === 'MongoError' || error.name === 'PrismaClientKnownRequestError') {
            // Handle database errors
            if (error.message.includes('duplicate key')) {
                statusCode = 409;
                message = 'Resource already exists';
            } else if (error.message.includes('not found')) {
                statusCode = 404;
                message = 'Resource not found';
            } else {
                statusCode = 500;
                message = 'Database error';
            }
        }

        // Log error with appropriate level
        if (isOperational) {
            logger.warn('Operational error occurred', {
                error: error.message,
                stack: error.stack,
                statusCode,
                path: req.path,
                method: req.method,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                userId: req.user?.userId,
            });
        } else {
            logger.error('Unexpected error occurred', {
                error: error.message,
                stack: error.stack,
                statusCode,
                path: req.path,
                method: req.method,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                userId: req.user?.userId,
            });
        }

        // Send error response
        res.status(statusCode).json({
            success: false,
            error: message,
            ...(process.env.NODE_ENV === 'development' && {
                stack: error.stack,
                details: error.message,
            }),
        });
    }

    /**
     * 404 handler for undefined routes
     * Monitoring: Logs attempts to access non-existent routes
     */
    public static notFoundHandler(req: Request, res: Response, next: NextFunction): void {
        logger.warn('Route not found', {
            path: req.path,
            method: req.method,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
        });

        res.status(404).json({
            success: false,
            error: 'Route not found',
            message: `Cannot ${req.method} ${req.path}`,
        });
    }

    /**
     * Async error wrapper for route handlers
     * Monitoring: Catches async errors and passes them to error handler
     */
    public static asyncHandler(fn: Function) {
        return (req: Request, res: Response, next: NextFunction) => {
            Promise.resolve(fn(req, res, next)).catch(next);
        };
    }

    /**
     * Handle unhandled promise rejections
     * Monitoring: Logs unhandled promise rejections
     */
    public static handleUnhandledRejection(reason: any, promise: Promise<any>): void {
        logger.error('Unhandled Promise Rejection', {
            reason: reason?.message || reason,
            stack: reason?.stack,
            promise: promise.toString(),
        });

        // In production, you might want to exit the process
        if (process.env.NODE_ENV === 'production') {
            process.exit(1);
        }
    }

    /**
     * Handle uncaught exceptions
     * Monitoring: Logs uncaught exceptions
     */
    public static handleUncaughtException(error: Error): void {
        logger.error('Uncaught Exception', {
            error: error.message,
            stack: error.stack,
        });

        // In production, you might want to exit the process
        if (process.env.NODE_ENV === 'production') {
            process.exit(1);
        }
    }

    /**
     * Handle graceful shutdown
     * Monitoring: Logs application shutdown
     */
    public static handleGracefulShutdown(signal: string): void {
        logger.info('Received shutdown signal', { signal });

        // Close database connections
        // Close server
        // Clean up resources

        process.exit(0);
    }

    /**
     * Request timeout handler
     * Performance: Prevents hanging requests
     */
    public static timeoutHandler(timeoutMs: number = 30000) {
        return (req: Request, res: Response, next: NextFunction) => {
            const timeout = setTimeout(() => {
                logger.warn('Request timeout', {
                    path: req.path,
                    method: req.method,
                    ip: req.ip,
                    timeoutMs,
                });

                if (!res.headersSent) {
                    res.status(408).json({
                        success: false,
                        error: 'Request timeout',
                        message: 'Request took too long to process',
                    });
                }
            }, timeoutMs);

            res.on('finish', () => {
                clearTimeout(timeout);
            });

            next();
        };
    }

    /**
     * Memory usage monitoring
     * Monitoring: Tracks memory usage for performance monitoring
     */
    public static memoryUsageHandler(req: Request, res: Response, next: NextFunction): void {
        const memUsage = process.memoryUsage();

        // Log if memory usage is high
        if (memUsage.heapUsed > 100 * 1024 * 1024) { // 100MB
            logger.warn('High memory usage detected', {
                heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
                heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
                external: Math.round(memUsage.external / 1024 / 1024) + 'MB',
                path: req.path,
                method: req.method,
            });
        }

        next();
    }

    /**
     * Response time monitoring
     * Performance: Tracks response times for performance monitoring
     */
    public static responseTimeHandler(req: Request, res: Response, next: NextFunction): void {
        const start = Date.now();

        res.on('finish', () => {
            const duration = Date.now() - start;

            // Log slow requests
            if (duration > 1000) { // 1 second
                logger.warn('Slow request detected', {
                    duration: duration + 'ms',
                    path: req.path,
                    method: req.method,
                    statusCode: res.statusCode,
                    ip: req.ip,
                });
            }

            // Log all requests in debug mode
            logger.debug('Request completed', {
                duration: duration + 'ms',
                path: req.path,
                method: req.method,
                statusCode: res.statusCode,
                ip: req.ip,
            });
        });

        next();
    }

    /**
     * Database connection error handler
     * Monitoring: Handles database connection issues
     */
    public static databaseErrorHandler(error: Error): void {
        logger.error('Database connection error', {
            error: error.message,
            stack: error.stack,
        });

        // Implement retry logic or fallback mechanisms
        // In production, you might want to alert the team
    }

    /**
     * External service error handler
     * Monitoring: Handles external service failures
     */
    public static externalServiceErrorHandler(service: string, error: Error): void {
        logger.error('External service error', {
            service,
            error: error.message,
            stack: error.stack,
        });

        // Implement circuit breaker or fallback mechanisms
        // In production, you might want to alert the team
    }
}

// Export error classes for use in services
export {
    AppError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ConflictError,
    RateLimitError,
}; 