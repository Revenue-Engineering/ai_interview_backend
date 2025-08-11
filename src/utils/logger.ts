// Structured logging utility using Winston
// Following monitoring best practices with structured logging

import winston from 'winston';
import path from 'path';

// Define log levels
const logLevels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

// Define log colors
const logColors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
};

// Add colors to Winston
winston.addColors(logColors);

// Create log format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.colorize({ all: true }),
    winston.format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message}`,
    ),
);

// Create file format (without colors)
const fileLogFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
);

// Create logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    levels: logLevels,
    format: fileLogFormat,
    transports: [
        // Error logs
        new winston.transports.File({
            filename: path.join(process.cwd(), 'logs', 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        // All logs
        new winston.transports.File({
            filename: path.join(process.cwd(), 'logs', 'combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
    ],
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
    logger.add(
        new winston.transports.Console({
            format: logFormat,
        })
    );
}

// Create a stream object for Morgan middleware
export const stream = {
    write: (message: string) => {
        logger.http(message.trim());
    },
};

// Export logger instance
export default logger;

// Helper functions for different log levels
export const logError = (message: string, error?: Error, meta?: any) => {
    logger.error(message, { error: error?.stack, ...meta });
};

export const logWarn = (message: string, meta?: any) => {
    logger.warn(message, meta);
};

export const logInfo = (message: string, meta?: any) => {
    logger.info(message, meta);
};

export const logDebug = (message: string, meta?: any) => {
    logger.debug(message, meta);
};

export const logHttp = (message: string, meta?: any) => {
    logger.http(message, meta);
}; 