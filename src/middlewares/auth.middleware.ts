// Authentication middleware using JWT tokens
// Following security best practices with JWT authentication and role-based access control

import { Request, Response, NextFunction } from 'express';
import { AuthUtils } from '@/utils/auth';
import logger from '@/utils/logger';
import { getCurrentUTCTimestamp } from '@/utils/datetime';

// Extend Express Request interface to include user information
declare global {
    namespace Express {
        interface Request {
            user?: {
                userType: string;
                userId: string;
                email: string;
                firstName: string;
                lastName: string;
                type: 'recruiter' | 'candidate' | 'user';
                iat: number;
            };
        }
    }
}

// Middleware Pattern: Authentication middleware for route protection
export class AuthMiddleware {
    /**
     * Middleware to authenticate JWT tokens
     * Security: JWT authentication ensures secure user sessions
     */
    public static authenticate(req: Request, res: Response, next: NextFunction): void {
        try {
            const authHeader = req.headers.authorization;

            if (!authHeader) {
                res.status(401).json({
                    success: false,
                    error: 'Authentication required',
                    message: 'Authorization header missing',
                });
                return;
            }

            // Extract and verify token
            const token = AuthUtils.extractTokenFromHeader(authHeader);
            const decoded = AuthUtils.verifyToken(token);

            // Attach user information to request
            req.user = decoded;

            logger.debug('User authenticated', {
                userId: decoded.userId,
                email: decoded.email,
                type: decoded.type
            });

            next();
        } catch (error) {
            logger.warn('Authentication failed', { error: error.message, ip: req.ip });

            res.status(401).json({
                success: false,
                error: 'Authentication failed',
                message: error.message,
            });
        }
    }

    /**
     * Middleware to require recruiter role
     * Security: Role-based access control for recruiter-only endpoints
     */
    public static requireRecruiter(req: Request, res: Response, next: NextFunction): void {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    error: 'Authentication required',
                    message: 'User not authenticated',
                });
                return;
            }

            if (req.user.userType !== 'RECRUITER') {
                logger.warn('Access denied: Recruiter role required', {
                    userId: req.user.userId,
                    userType: req.user.userType
                });

                res.status(403).json({
                    success: false,
                    error: 'Access denied',
                    message: 'Recruiter role required',
                });
                return;
            }

            logger.debug('Recruiter access granted', {
                userId: req.user.userId,
                email: req.user.email
            });

            next();
        } catch (error) {
            logger.error('Error in recruiter authorization', { error });

            res.status(500).json({
                success: false,
                error: 'Authorization error',
                message: 'Internal server error',
            });
        }
    }

    /**
     * Middleware to require candidate role
     * Security: Role-based access control for candidate-only endpoints
     */
    public static requireCandidate(req: Request, res: Response, next: NextFunction): void {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    error: 'Authentication required',
                    message: 'User not authenticated',
                });
                return;
            }

            if (req.user.type !== 'candidate') {
                logger.warn('Access denied: Candidate role required', {
                    userId: req.user.userId,
                    userType: req.user.type
                });

                res.status(403).json({
                    success: false,
                    error: 'Access denied',
                    message: 'Candidate role required',
                });
                return;
            }

            logger.debug('Candidate access granted', {
                userId: req.user.userId,
                email: req.user.email
            });

            next();
        } catch (error) {
            logger.error('Error in candidate authorization', { error });

            res.status(500).json({
                success: false,
                error: 'Authorization error',
                message: 'Internal server error',
            });
        }
    }

    /**
     * Middleware to require either recruiter or candidate role
     * Security: Flexible role-based access control
     */
    public static requireUser(req: Request, res: Response, next: NextFunction): void {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    error: 'Authentication required',
                    message: 'User not authenticated',
                });
                return;
            }

            if (req.user.type !== 'recruiter' && req.user.type !== 'candidate') {
                logger.warn('Access denied: Invalid user type', {
                    userId: req.user.userId,
                    userType: req.user.type
                });

                res.status(403).json({
                    success: false,
                    error: 'Access denied',
                    message: 'Invalid user type',
                });
                return;
            }

            logger.debug('User access granted', {
                userId: req.user.userId,
                email: req.user.email,
                type: req.user.type
            });

            next();
        } catch (error) {
            logger.error('Error in user authorization', { error });

            res.status(500).json({
                success: false,
                error: 'Authorization error',
                message: 'Internal server error',
            });
        }
    }

    /**
     * Middleware to check if user owns the resource
     * Security: Resource ownership validation
     */
    public static requireOwnership(resourceType: 'recruiter' | 'candidate' | 'application' | 'job') {
        return (req: Request, res: Response, next: NextFunction): void => {
            try {
                if (!req.user) {
                    res.status(401).json({
                        success: false,
                        error: 'Authentication required',
                        message: 'User not authenticated',
                    });
                    return;
                }

                const resourceId = req.params.id || req.params.recruiterId || req.params.candidateId || req.params.applicationId || req.params.jobId;

                if (!resourceId) {
                    res.status(400).json({
                        success: false,
                        error: 'Bad request',
                        message: 'Resource ID required',
                    });
                    return;
                }

                // For recruiter and candidate resources, check if user owns the resource
                if (resourceType === 'recruiter' && req.user.type === 'recruiter') {
                    if (req.user.userId !== resourceId) {
                        logger.warn('Access denied: Recruiter does not own resource', {
                            userId: req.user.userId,
                            resourceId
                        });

                        res.status(403).json({
                            success: false,
                            error: 'Access denied',
                            message: 'You do not have permission to access this resource',
                        });
                        return;
                    }
                }

                if (resourceType === 'candidate' && req.user.type === 'candidate') {
                    if (req.user.userId !== resourceId) {
                        logger.warn('Access denied: Candidate does not own resource', {
                            userId: req.user.userId,
                            resourceId
                        });

                        res.status(403).json({
                            success: false,
                            error: 'Access denied',
                            message: 'You do not have permission to access this resource',
                        });
                        return;
                    }
                }

                logger.debug('Resource ownership verified', {
                    userId: req.user.userId,
                    resourceId,
                    resourceType
                });

                next();
            } catch (error) {
                logger.error('Error in resource ownership check', { error });

                res.status(500).json({
                    success: false,
                    error: 'Authorization error',
                    message: 'Internal server error',
                });
            }
        };
    }

    /**
     * Optional authentication middleware
     * Security: Allows endpoints to work with or without authentication
     */
    public static optionalAuth(req: Request, res: Response, next: NextFunction): void {
        try {
            const authHeader = req.headers.authorization;

            if (!authHeader) {
                // No authentication provided, continue without user context
                next();
                return;
            }

            // Try to authenticate, but don't fail if it doesn't work
            try {
                const token = AuthUtils.extractTokenFromHeader(authHeader);
                const decoded = AuthUtils.verifyToken(token);
                req.user = decoded;

                logger.debug('Optional authentication successful', {
                    userId: decoded.userId,
                    email: decoded.email,
                    type: decoded.type
                });
            } catch (error) {
                // Authentication failed, but that's okay for optional auth
                logger.debug('Optional authentication failed, continuing without user context', {
                    error: error.message
                });
            }

            next();
        } catch (error) {
            logger.error('Error in optional authentication', { error });
            next();
        }
    }

    /**
     * Rate limiting middleware (basic implementation)
     * Security: Rate limiting prevents API abuse
     */
    public static rateLimit(maxRequests: number = 100, windowMs: number = 900000) {
        const requests = new Map<string, { count: number; resetTime: number }>();

        return (req: Request, res: Response, next: NextFunction): void => {
            try {
                const key = req.ip || 'unknown';
                const now = getCurrentUTCTimestamp();

                const userRequests = requests.get(key);

                if (!userRequests || now > userRequests.resetTime) {
                    // First request or window expired
                    requests.set(key, {
                        count: 1,
                        resetTime: now + windowMs,
                    });
                } else if (userRequests.count >= maxRequests) {
                    // Rate limit exceeded
                    logger.warn('Rate limit exceeded', { ip: key, count: userRequests.count });

                    res.status(429).json({
                        success: false,
                        error: 'Rate limit exceeded',
                        message: `Too many requests. Please try again in ${Math.ceil((userRequests.resetTime - now) / 1000)} seconds.`,
                    });
                    return;
                } else {
                    // Increment request count
                    userRequests.count++;
                }

                next();
            } catch (error) {
                logger.error('Error in rate limiting', { error });
                next();
            }
        };
    }
} 