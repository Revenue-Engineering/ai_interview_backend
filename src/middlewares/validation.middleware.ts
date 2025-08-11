// Validation middleware using Zod schemas
// Following security best practices with input validation and sanitization

import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import logger from '@/utils/logger';

// Middleware Pattern: Validation middleware for input sanitization
export class ValidationMiddleware {
    /**
     * Generic validation middleware using Zod schema
     * Security: Input validation prevents injection attacks
     */
    public static validate(schema: z.ZodSchema, location: 'body' | 'query' | 'params' = 'body') {
        return (req: Request, res: Response, next: NextFunction): void => {
            try {
                const data = req[location];

                // Validate data against schema
                const validatedData = schema.parse(data);

                // Replace original data with validated data
                req[location] = validatedData;

                logger.debug('Request validation successful', {
                    location,
                    path: req.path,
                    method: req.method
                });

                next();
            } catch (error) {
                if (error instanceof ZodError) {
                    // Format validation errors
                    const errors = error.errors.map(err => ({
                        field: err.path.join('.'),
                        message: err.message,
                        code: err.code,
                    }));

                    logger.warn('Request validation failed', {
                        errors,
                        path: req.path,
                        method: req.method,
                        ip: req.ip
                    });

                    res.status(400).json({
                        success: false,
                        error: 'Validation failed',
                        message: 'Invalid input data',
                        details: errors,
                    });
                } else {
                    logger.error('Unexpected validation error', { error });

                    res.status(500).json({
                        success: false,
                        error: 'Validation error',
                        message: 'Internal server error during validation',
                    });
                }
            }
        };
    }

    /**
     * Validate request body
     * Security: Body validation prevents malicious payloads
     */
    public static validateBody(schema: z.ZodSchema) {
        return ValidationMiddleware.validate(schema, 'body');
    }

    /**
     * Validate request query parameters
     * Security: Query validation prevents injection attacks
     */
    public static validateQuery(schema: z.ZodSchema) {
        return ValidationMiddleware.validate(schema, 'query');
    }

    /**
     * Validate request path parameters
     * Security: Params validation ensures valid resource IDs
     */
    public static validateParams(schema: z.ZodSchema) {
        return ValidationMiddleware.validate(schema, 'params');
    }

    /**
     * Sanitize and validate pagination parameters
     * Performance: Pagination validation prevents memory issues
     */
    public static validatePagination() {
        const paginationSchema = z.object({
            page: z.coerce.number().int().min(1).default(1),
            limit: z.coerce.number().int().min(1).max(100).default(10),
            sortBy: z.string().optional(),
            sortOrder: z.enum(['asc', 'desc']).default('desc'),
        });

        return ValidationMiddleware.validateQuery(paginationSchema);
    }

    /**
     * Validate ID parameter
     * Security: ID validation ensures valid resource identifiers
     */
    public static validateId() {
        const idSchema = z.object({
            id: z.string().cuid('Invalid ID format'),
        });

        return ValidationMiddleware.validateParams(idSchema);
    }

    /**
     * Validate multiple ID parameters
     * Security: Multiple ID validation for bulk operations
     */
    public static validateIds() {
        const idsSchema = z.object({
            ids: z.string().transform((val) => val.split(',').filter(Boolean)),
        });

        return ValidationMiddleware.validateQuery(idsSchema);
    }

    /**
     * Sanitize string inputs
     * Security: String sanitization prevents XSS attacks
     */
    public static sanitizeString(input: string): string {
        if (typeof input !== 'string') {
            return '';
        }

        // Remove HTML tags and dangerous characters
        return input
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/[<>]/g, '') // Remove angle brackets
            .replace(/javascript:/gi, '') // Remove javascript: protocol
            .replace(/on\w+=/gi, '') // Remove event handlers
            .trim();
    }

    /**
     * Sanitize object properties
     * Security: Object sanitization for nested data
     */
    public static sanitizeObject(obj: any): any {
        if (typeof obj !== 'object' || obj === null) {
            return obj;
        }

        if (Array.isArray(obj)) {
            return obj.map(item => ValidationMiddleware.sanitizeObject(item));
        }

        const sanitized: any = {};
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string') {
                sanitized[key] = ValidationMiddleware.sanitizeString(value);
            } else if (typeof value === 'object' && value !== null) {
                sanitized[key] = ValidationMiddleware.sanitizeObject(value);
            } else {
                sanitized[key] = value;
            }
        }

        return sanitized;
    }

    /**
     * Sanitize request body middleware
     * Security: Request body sanitization prevents XSS
     */
    public static sanitizeBody(req: Request, res: Response, next: NextFunction): void {
        try {
            if (req.body && typeof req.body === 'object') {
                req.body = ValidationMiddleware.sanitizeObject(req.body);
            }

            next();
        } catch (error) {
            logger.error('Error sanitizing request body', { error });
            next();
        }
    }

    /**
     * Sanitize query parameters middleware
     * Security: Query parameter sanitization prevents injection
     */
    public static sanitizeQuery(req: Request, res: Response, next: NextFunction): void {
        try {
            if (req.query && typeof req.query === 'object') {
                req.query = ValidationMiddleware.sanitizeObject(req.query);
            }

            next();
        } catch (error) {
            logger.error('Error sanitizing query parameters', { error });
            next();
        }
    }

    /**
     * Validate email format
     * Security: Email validation prevents invalid email attacks
     */
    public static validateEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Validate phone number format
     * Security: Phone validation ensures proper format
     */
    public static validatePhone(phone: string): boolean {
        const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
        return phoneRegex.test(phone);
    }

    /**
     * Validate URL format
     * Security: URL validation prevents malicious links
     */
    public static validateUrl(url: string): boolean {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Validate password strength
     * Security: Password strength validation for better security
     */
    public static validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (password.length < 8) {
            errors.push('Password must be at least 8 characters long');
        }

        if (!/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter');
        }

        if (!/[a-z]/.test(password)) {
            errors.push('Password must contain at least one lowercase letter');
        }

        if (!/[0-9]/.test(password)) {
            errors.push('Password must contain at least one number');
        }

        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            errors.push('Password must contain at least one special character');
        }

        return {
            isValid: errors.length === 0,
            errors,
        };
    }

    /**
     * Custom validation for date ranges
     * Security: Date validation prevents invalid date attacks
     */
    public static validateDateRange(startDate: string, endDate: string): { isValid: boolean; error?: string } {
        try {
            const start = new Date(startDate);
            const end = new Date(endDate);

            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                return { isValid: false, error: 'Invalid date format' };
            }

            if (start > end) {
                return { isValid: false, error: 'Start date cannot be after end date' };
            }

            return { isValid: true };
        } catch (error) {
            return { isValid: false, error: 'Invalid date format' };
        }
    }

    /**
     * Validate file upload
     * Security: File validation prevents malicious uploads
     */
    public static validateFileUpload(file: Express.Multer.File, allowedTypes: string[], maxSize: number): { isValid: boolean; error?: string } {
        if (!file) {
            return { isValid: false, error: 'No file uploaded' };
        }

        if (!allowedTypes.includes(file.mimetype)) {
            return { isValid: false, error: 'Invalid file type' };
        }

        if (file.size > maxSize) {
            return { isValid: false, error: 'File too large' };
        }

        return { isValid: true };
    }

    /**
     * Validate and sanitize search query
     * Security: Search query sanitization prevents injection
     */
    public static validateSearchQuery(query: string): { isValid: boolean; sanitized?: string; error?: string } {
        if (!query || typeof query !== 'string') {
            return { isValid: false, error: 'Invalid search query' };
        }

        const sanitized = ValidationMiddleware.sanitizeString(query);

        if (sanitized.length < 2) {
            return { isValid: false, error: 'Search query too short' };
        }

        if (sanitized.length > 100) {
            return { isValid: false, error: 'Search query too long' };
        }

        return { isValid: true, sanitized };
    }
} 