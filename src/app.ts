import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import logger from '@/utils/logger';
import { getCurrentUTCISO } from '@/utils/datetime';

// Import database
import { DatabaseClient } from '@/utils/database';
import { ValidationMiddleware } from '@/middlewares/validation.middleware';
import { ErrorMiddleware } from '@/middlewares/error.middleware';

// Load environment variables
dotenv.config();

// MVC Pattern: Express app setup with proper middleware configuration
export class App {
    public app: express.Application;
    private db: DatabaseClient;

    constructor() {
        this.app = express();
        this.db = DatabaseClient.getInstance();
        this.configureMiddleware();
        this.configureSecurity();
        this.configureRoutes();
        this.configureErrorHandling();
    }

    /**
     * Configure all middleware
     * Middleware Pattern: Comprehensive middleware stack for request processing
     */
    private configureMiddleware(): void {
        // Security: Helmet middleware adds security headers
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", "data:", "https:"],
                },
            },
        }));

        // Security: CORS configuration prevents unauthorized cross-origin access
        this.app.use(cors({
            origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
            allowedHeaders: ['Content-Type', 'Authorization'],
        }));

        // Performance: Compression middleware reduces response size
        this.app.use(compression());

        // Security: Rate limiting prevents API abuse
        const limiter = rateLimit({
            windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
            max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
            message: {
                success: false,
                error: 'Rate limit exceeded',
                message: 'Too many requests from this IP, please try again later.',
            },
            standardHeaders: true,
            legacyHeaders: false,
        });
        this.app.use('/api/', limiter);

        // Body parsing middleware
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Security: Input sanitization prevents XSS attacks
        this.app.use(ValidationMiddleware.sanitizeBody);
        this.app.use(ValidationMiddleware.sanitizeQuery);

        // Monitoring: Response time tracking for performance monitoring
        this.app.use(ErrorMiddleware.responseTimeHandler);

        // Monitoring: Memory usage tracking
        this.app.use(ErrorMiddleware.memoryUsageHandler);

        // Performance: Request timeout handling prevents hanging requests
        this.app.use(ErrorMiddleware.timeoutHandler(30000)); // 30 seconds
    }

    /**
     * Configure security settings
     * Security: Comprehensive security configuration
     */
    private configureSecurity(): void {
        // Remove X-Powered-By header
        this.app.disable('x-powered-by');

        // Trust proxy for rate limiting
        this.app.set('trust proxy', 1);

        // Security headers
        this.app.use((req, res, next) => {
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('X-Frame-Options', 'DENY');
            res.setHeader('X-XSS-Protection', '1; mode=block');
            res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
            next();
        });
    }

    /**
     * Configure API routes
     * API Design: Versioned endpoints enable backward compatibility
     */
    private configureRoutes(): void {
        // Health check endpoint
        this.app.get('/health', async (req, res) => {
            try {
                // Check database connection
                await this.db.getClient().$queryRaw`SELECT 1`;

                res.status(200).json({
                    success: true,
                    message: 'Service is healthy',
                    timestamp: getCurrentUTCISO(),
                    uptime: process.uptime(),
                    environment: process.env.NODE_ENV,
                });
            } catch (error) {
                logger.error('Health check failed', { error });
                res.status(503).json({
                    success: false,
                    message: 'Service is unhealthy',
                    timestamp: getCurrentUTCISO(),
                });
            }
        });

        // API versioning
        this.app.use('/api/v1', this.setupApiRoutes());

        // Root endpoint
        this.app.get('/', (req, res) => {
            res.json({
                success: true,
                message: 'Recruitment Platform API',
                version: '1.0.0',
                documentation: '/api/v1/docs',
                health: '/health',
            });
        });
    }

    /**
 * Setup API routes with versioning
 * API Design: Versioned endpoints enable backward compatibility
 */
    private setupApiRoutes(): express.Router {
        const router = express.Router();

        // Import and register route handlers
        const {
            testRoutes,
            authRoutes,
            jobRoutes,
            applicationRoutes,
            interviewRoutes,
            candidateRoutes,
            recruiterCandidateRoutes,
            dsaQuestionRoutes
        } = require('./routes');

        router.use('/test', testRoutes);
        router.use('/auth', authRoutes);
        router.use('/jobs', jobRoutes);
        router.use('/applications', applicationRoutes);
        router.use('/interviews', interviewRoutes);
        router.use('/candidates', candidateRoutes);
        router.use('/recruiter-candidates', recruiterCandidateRoutes);
        router.use('/dsa-questions', dsaQuestionRoutes);

        // API root endpoint
        router.get('/', (req, res) => {
            res.json({
                success: true,
                message: 'Recruitment Platform API v1',
                endpoints: {
                    test: '/api/v1/test',
                },
            });
        });

        // API documentation endpoint
        router.get('/docs', (req, res) => {
            res.json({
                success: true,
                message: 'API Documentation',
                version: '1.0.0',
                endpoints: {
                    // Organization endpoints
                    'POST /organizations': 'Create a new organization',
                    'GET /organizations': 'Get all organizations with pagination',
                    'GET /organizations/:id': 'Get organization by ID',
                    'PUT /organizations/:id': 'Update organization',
                    'DELETE /organizations/:id': 'Delete organization',

                    // Candidate endpoints
                    'POST /candidates/signup': 'Candidate signup',
                    'POST /candidates/login': 'Candidate login',
                    'GET /candidates': 'Get all candidates',
                    'GET /candidates/:id': 'Get candidate by ID',
                    'PUT /candidates/:id': 'Update candidate profile',

                    // Job endpoints
                    'POST /jobs': 'Create a new job posting',
                    'GET /jobs': 'Get all jobs with filtering',
                    'GET /jobs/:id': 'Get job by ID',
                    'PUT /jobs/:id': 'Update job posting',
                    'DELETE /jobs/:id': 'Delete job posting',

                    // Application endpoints
                    'POST /applications/bulk': 'Create bulk applications for candidates',
                    'GET /applications/job/:jobId': 'Get applications by job ID',
                    'GET /applications/recruiter': 'Get all applications for recruiter',
                    'GET /applications/stats': 'Get application statistics',
                    'GET /applications/:id': 'Get application by ID',
                    'PUT /applications/:id/status': 'Update application status',
                    'DELETE /applications/:id': 'Delete application',

                    // Interview endpoints
                    'POST /interviews': 'Schedule an interview',
                    'GET /interviews/recruiter': 'Get recruiter interviews',
                    'GET /interviews/candidate': 'Get candidate interviews',
                    'GET /interviews/:id': 'Get interview by ID',
                    'PUT /interviews/:id': 'Update interview',
                    'PUT /interviews/:id/cancel': 'Cancel interview',
                    'DELETE /interviews/:id': 'Delete interview',
                    'POST /interviews/start': 'Start interview (candidate)',
                    'POST /interviews/end': 'End interview with AI results',
                    'GET /interviews/recruiter/stats': 'Get interview statistics',

                    // Candidate endpoints
                    'GET /candidates/applications': 'Get candidate applications',
                    'GET /candidates/applications/:id': 'Get application details',
                    'GET /candidates/applications/stats': 'Get application statistics',
                    'GET /candidates/profile': 'Get candidate profile',
                    'PUT /candidates/profile': 'Update candidate profile',
                    'GET /candidates/jobs/:jobId': 'Get job details',
                    'GET /candidates/organizations/:organizationId': 'Get organization details',

                    // Recruiter Candidate endpoints
                    'GET /recruiter-candidates/by-email/:email': 'Get candidate details by email (recruiter access)',
                    'GET /recruiter-candidates/:candidateId/applications': 'Get candidate with applications (recruiter access)',
                    'POST /recruiter-candidates/bulk-assign': 'Bulk assign candidates to interviews with scheduling',
                },
                authentication: {
                    type: 'Bearer Token',
                    header: 'Authorization: Bearer <token>',
                },
                pagination: {
                    page: 'Page number (default: 1)',
                    limit: 'Items per page (default: 10, max: 100)',
                    sortBy: 'Sort field (default: createdAt)',
                    sortOrder: 'Sort order: asc or desc (default: desc)',
                },
            });
        });

        return router;
    }

    /**
     * Configure error handling
     * Monitoring: Centralized error handling for consistent responses
     */
    private configureErrorHandling(): void {
        // 404 handler for undefined routes
        this.app.use(ErrorMiddleware.notFoundHandler);

        // Global error handler
        this.app.use(ErrorMiddleware.errorHandler);

        // Handle unhandled promise rejections
        process.on('unhandledRejection', ErrorMiddleware.handleUnhandledRejection);

        // Handle uncaught exceptions
        process.on('uncaughtException', ErrorMiddleware.handleUncaughtException);

        // Handle graceful shutdown
        process.on('SIGTERM', () => ErrorMiddleware.handleGracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => ErrorMiddleware.handleGracefulShutdown('SIGINT'));
    }

    /**
     * Start the server
     * Performance: Async/await prevents event loop blocking
     */
    public async start(port: number = parseInt(process.env.PORT || '8000')): Promise<void> {
        try {
            // Test database connection
            await this.db.getClient().$connect();
            logger.info('Database connected successfully');

            // Start server
            this.app.listen(port, () => {
                logger.info(`Server started successfully`, {
                    port,
                    environment: process.env.NODE_ENV,
                    nodeVersion: process.version,
                });
            });
        } catch (error) {
            logger.error('Failed to start server', { error });
            process.exit(1);
        }
    }

    /**
     * Graceful shutdown
     * Performance: Proper cleanup prevents resource leaks
     */
    public async shutdown(): Promise<void> {
        try {
            logger.info('Shutting down server...');

            // Close database connection
            await this.db.getClient().$disconnect();
            logger.info('Database disconnected');

            process.exit(0);
        } catch (error) {
            logger.error('Error during shutdown', { error });
            process.exit(1);
        }
    }
}

// Export app instance
export default new App(); 
