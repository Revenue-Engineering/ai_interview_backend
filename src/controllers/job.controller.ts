import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { JobService } from '../services/job.service';
import { getDatabaseClient } from '../utils/database';
import { IJobPost, ICreateJobPostInput, IUpdateJobPostInput } from '../types';
import logger from '../utils/logger';
import { serializeUser, serializePaginatedResponse, serializeEntityResponse } from '../utils/serializer';

export class JobController extends BaseController<IJobPost, ICreateJobPostInput, IUpdateJobPostInput> {
    private jobService: JobService;

    constructor() {
        const db = getDatabaseClient();
        const jobService = new JobService(db);
        super(jobService);
        this.jobService = jobService;
    }

    /**
     * Create a new job post
     * Only recruiters can create job posts
     */
    public createJobPost = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = (req as any).user?.userId;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    error: 'Unauthorized',
                    message: 'User not authenticated',
                });
                return;
            }

            // Check if user is a recruiter
            const user = await this.jobService.prisma.user.findUnique({
                where: { id: BigInt(userId) }
            });

            if (!user || user.userType !== 'RECRUITER') {
                res.status(403).json({
                    success: false,
                    error: 'Forbidden',
                    message: 'Only recruiters can create job posts',
                });
                return;
            }

            if (!user.organizationId) {
                res.status(400).json({
                    success: false,
                    error: 'Bad request',
                    message: 'Recruiter must be associated with an organization',
                });
                return;
            }

            const job = await this.jobService.createJobPost(
                req.body,
                BigInt(userId),
                user.organizationId
            );

            res.status(201).json({
                success: true,
                data: serializeEntityResponse(job),
                message: 'Job post created successfully',
            });
        } catch (error) {
            logger.error('Error in createJobPost', { error });
            res.status(400).json({
                success: false,
                error: 'Bad request',
                message: error instanceof Error ? error.message : 'Failed to create job post',
            });
        }
    };

    /**
     * Update a job post
     */
    public updateJobPost = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const userId = (req as any).user?.userId;

            if (!userId) {
                res.status(401).json({
                    success: false,
                    error: 'Unauthorized',
                    message: 'User not authenticated',
                });
                return;
            }

            const job = await this.jobService.updateJobPost(id, req.body, BigInt(userId));

            if (!job) {
                res.status(404).json({
                    success: false,
                    error: 'Not found',
                    message: 'Job post not found',
                });
                return;
            }

            res.status(200).json({
                success: true,
                data: serializeEntityResponse(job),
                message: 'Job post updated successfully',
            });
        } catch (error) {
            logger.error('Error in updateJobPost', { error, id: req.params.id });
            res.status(400).json({
                success: false,
                error: 'Bad request',
                message: error instanceof Error ? error.message : 'Failed to update job post',
            });
        }
    };

    /**
     * Delete a job post
     */
    public deleteJobPost = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const userId = (req as any).user?.userId;

            if (!userId) {
                res.status(401).json({
                    success: false,
                    error: 'Unauthorized',
                    message: 'User not authenticated',
                });
                return;
            }

            const deleted = await this.jobService.deleteJobPost(id, BigInt(userId));

            if (!deleted) {
                res.status(404).json({
                    success: false,
                    error: 'Not found',
                    message: 'Job post not found',
                });
                return;
            }

            res.status(200).json({
                success: true,
                message: 'Job post deleted successfully',
            });
        } catch (error) {
            logger.error('Error in deleteJobPost', { error, id: req.params.id });
            res.status(400).json({
                success: false,
                error: 'Bad request',
                message: error instanceof Error ? error.message : 'Failed to delete job post',
            });
        }
    };

    /**
     * Get job post by ID
     */
    public getJobPostById = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const job = await this.jobService.findById(id);

            if (!job) {
                res.status(404).json({
                    success: false,
                    error: 'Not found',
                    message: 'Job post not found',
                });
                return;
            }

            res.status(200).json({
                success: true,
                data: serializeEntityResponse(job),
            });
        } catch (error) {
            logger.error('Error in getJobPostById', { error, id: req.params.id });
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: 'Failed to retrieve job post',
            });
        }
    };

    /**
     * Get job post by slug
     */
    public getJobPostBySlug = async (req: Request, res: Response): Promise<void> => {
        try {
            const { slug } = req.params;
            const job = await this.jobService.getJobPostBySlug(slug);

            if (!job) {
                res.status(404).json({
                    success: false,
                    error: 'Not found',
                    message: 'Job post not found',
                });
                return;
            }

            res.status(200).json({
                success: true,
                data: serializeEntityResponse(job),
            });
        } catch (error) {
            logger.error('Error in getJobPostBySlug', { error, slug: req.params.slug });
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: 'Failed to retrieve job post',
            });
        }
    };

    /**
     * Get all job posts with pagination
     */
    public getAllJobPosts = async (req: Request, res: Response): Promise<void> => {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const sortBy = (req.query.sortBy as string) || 'createdOn';
            const sortOrder = (req.query.sortOrder as string) || 'desc';

            const result = await this.jobService.findAll({ page, limit, sortBy, sortOrder });

            const serializedResult = serializePaginatedResponse(result);

            res.status(200).json({
                success: true,
                data: serializedResult.data,
                pagination: serializedResult.pagination,
            });
        } catch (error) {
            logger.error('Error in getAllJobPosts', { error });
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: 'Failed to retrieve job posts',
            });
        }
    };

    /**
     * Get job posts by organization (public route - organizationId from URL params)
     */
    public getJobPostsByOrganization = async (req: Request, res: Response): Promise<void> => {
        try {
            const { organizationId } = req.params;
            const parsedId = parseInt(organizationId);

            if (isNaN(parsedId)) {
                res.status(400).json({
                    success: false,
                    error: 'Bad request',
                    message: 'Invalid organization ID',
                });
                return;
            }

            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const sortBy = (req.query.sortBy as string) || 'createdOn';
            const sortOrder = (req.query.sortOrder as string) || 'desc';

            const result = await this.jobService.getJobPostsByOrganization(
                parsedId,
                { page, limit, sortBy, sortOrder }
            );

            const serializedResult = serializePaginatedResponse(result);

            res.status(200).json({
                success: true,
                data: serializedResult.data,
                pagination: serializedResult.pagination,
            });
        } catch (error) {
            logger.error('Error in getJobPostsByOrganization', { error, organizationId: req.params.organizationId });
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: 'Failed to retrieve job posts',
            });
        }
    };

    /**
     * Get job posts by authenticated user's organization
     */
    public getJobPostsByUserOrganization = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = (req as any).user?.userId;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    error: 'Unauthorized',
                    message: 'User not authenticated',
                });
                return;
            }

            const user = await this.jobService.prisma.user.findUnique({
                where: { id: BigInt(userId) }
            });

            if (!user || !user.organizationId) {
                res.status(400).json({
                    success: false,
                    error: 'Bad request',
                    message: 'User must be associated with an organization',
                });
                return;
            }

            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const sortBy = (req.query.sortBy as string) || 'createdOn';
            const sortOrder = (req.query.sortOrder as string) || 'desc';

            const result = await this.jobService.getJobPostsByOrganization(
                user.organizationId,
                { page, limit, sortBy, sortOrder }
            );

            const serializedResult = serializePaginatedResponse(result);

            res.status(200).json({
                success: true,
                data: serializedResult.data,
                pagination: serializedResult.pagination,
            });
        } catch (error) {
            logger.error('Error in getJobPostsByUserOrganization', { error });
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: 'Failed to retrieve job posts',
            });
        }
    };

    /**
     * Get job posts by user (recruiter)
     */
    public getJobPostsByUser = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = (req as any).user?.userId;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    error: 'Unauthorized',
                    message: 'User not authenticated',
                });
                return;
            }

            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const sortBy = (req.query.sortBy as string) || 'createdOn';
            const sortOrder = (req.query.sortOrder as string) || 'desc';

            const result = await this.jobService.getJobPostsByUser(
                BigInt(userId),
                { page, limit, sortBy, sortOrder }
            );

            const serializedResult = serializePaginatedResponse(result);

            res.status(200).json({
                success: true,
                data: serializedResult.data,
                pagination: serializedResult.pagination,
            });
        } catch (error) {
            logger.error('Error in getJobPostsByUser', { error });
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: 'Failed to retrieve job posts',
            });
        }
    };

    /**
     * Search job posts
     */
    public searchJobPosts = async (req: Request, res: Response): Promise<void> => {
        try {
            const { q } = req.query;
            if (!q || typeof q !== 'string') {
                res.status(400).json({
                    success: false,
                    error: 'Bad request',
                    message: 'Search query is required',
                });
                return;
            }

            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const sortBy = (req.query.sortBy as string) || 'createdOn';
            const sortOrder = (req.query.sortOrder as string) || 'desc';

            const result = await this.jobService.searchJobPosts(
                q,
                { page, limit, sortBy, sortOrder }
            );

            const serializedResult = serializePaginatedResponse(result);

            res.status(200).json({
                success: true,
                data: serializedResult.data,
                pagination: serializedResult.pagination,
            });
        } catch (error) {
            logger.error('Error in searchJobPosts', { error });
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: 'Failed to search job posts',
            });
        }
    };

    /**
     * Get job post statistics
     */
    public getJobPostStats = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = (req as any).user?.userId;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    error: 'Unauthorized',
                    message: 'User not authenticated',
                });
                return;
            }

            const user = await this.jobService.prisma.user.findUnique({
                where: { id: BigInt(userId) }
            });

            if (!user || !user.organizationId) {
                res.status(400).json({
                    success: false,
                    error: 'Bad request',
                    message: 'User must be associated with an organization',
                });
                return;
            }

            const stats = await this.jobService.getJobPostStats(user.organizationId);

            res.status(200).json({
                success: true,
                data: stats,
            });
        } catch (error) {
            logger.error('Error in getJobPostStats', { error });
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: 'Failed to retrieve job post statistics',
            });
        }
    };
} 