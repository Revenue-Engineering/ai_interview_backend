import { PrismaClient } from '@prisma/client';
import { BaseService } from './base.service';
import { IJobPost, ICreateJobPostInput, IUpdateJobPostInput } from '../types';
import logger from '../utils/logger';
import { serializeUser } from '../utils/serializer';

export class JobService extends BaseService<IJobPost, ICreateJobPostInput, IUpdateJobPostInput> {
    constructor(prisma: PrismaClient) {
        super(prisma, 'jobPost');
    }

    /**
     * Create a new job post
     * Only recruiters can create job posts
     */
    public async createJobPost(data: ICreateJobPostInput, userId: bigint, organizationId: number): Promise<IJobPost> {
        try {
            logger.info('Creating new job post', { userId: userId.toString(), organizationId });

            // Generate slug from job name
            const slug = this.generateSlug(data.name);

            // Check if slug already exists
            const existingJob = await this.findOneByCriteria({ slug });
            if (existingJob) {
                throw new Error('A job with this name already exists');
            }

            const jobData = {
                ...data,
                slug,
                createdBy: Number(userId),
                updatedBy: Number(userId),
                organizationId,
                userId,
            };

            const job = await this.create(jobData);

            logger.info('Job post created successfully', {
                jobId: job.id,
                userId: userId.toString(),
                organizationId
            });

            return job;
        } catch (error) {
            logger.error('Error creating job post', { error, userId: userId.toString(), organizationId });
            throw error;
        }
    }

    /**
     * Update a job post
     * Only the creator or organization admin can update
     */
    public async updateJobPost(id: string, data: IUpdateJobPostInput, userId: bigint): Promise<IJobPost | null> {
        try {
            logger.info('Updating job post', { jobId: id, userId: userId.toString() });

            // Check if job exists and user has permission
            const existingJob = await this.findById(id);
            if (!existingJob) {
                throw new Error('Job post not found');
            }

            // Check if user is the creator or has admin rights
            if (existingJob.userId !== userId) {
                // Check if user is admin of the organization
                const user = await this.prisma.user.findUnique({
                    where: { id: userId },
                    include: { organization: true }
                });

                if (!user || user.userRole !== 'ADMIN' || user.organizationId !== existingJob.organizationId) {
                    throw new Error('You do not have permission to update this job post');
                }
            }

            // If name is being updated, generate new slug
            let updatedData = { ...data, updatedBy: Number(userId) };
            if (data.name && data.name !== existingJob.name) {
                const newSlug = this.generateSlug(data.name);

                // Check if new slug already exists
                const existingJobWithSlug = await this.findOneByCriteria({ slug: newSlug });
                if (existingJobWithSlug && existingJobWithSlug.id !== Number(id)) {
                    throw new Error('A job with this name already exists');
                }

                updatedData.slug = newSlug;
            }

            const updatedJob = await this.update(id, updatedData);

            logger.info('Job post updated successfully', { jobId: id, userId: userId.toString() });

            return updatedJob;
        } catch (error) {
            logger.error('Error updating job post', { error, jobId: id, userId: userId.toString() });
            throw error;
        }
    }

    /**
     * Delete a job post
     * Only the creator or organization admin can delete
     */
    public async deleteJobPost(id: string, userId: bigint): Promise<boolean> {
        try {
            logger.info('Deleting job post', { jobId: id, userId: userId.toString() });

            // Check if job exists and user has permission
            const existingJob = await this.findById(id);
            if (!existingJob) {
                throw new Error('Job post not found');
            }

            // Check if user is the creator or has admin rights
            if (existingJob.userId !== userId) {
                // Check if user is admin of the organization
                const user = await this.prisma.user.findUnique({
                    where: { id: userId },
                    include: { organization: true }
                });

                if (!user || user.userRole !== 'ADMIN' || user.organizationId !== existingJob.organizationId) {
                    throw new Error('You do not have permission to delete this job post');
                }
            }

            const deleted = await this.delete(id);

            logger.info('Job post deleted successfully', { jobId: id, userId: userId.toString() });

            return deleted;
        } catch (error) {
            logger.error('Error deleting job post', { error, jobId: id, userId: userId.toString() });
            throw error;
        }
    }

    /**
     * Get job posts by organization
     */
    public async getJobPostsByOrganization(organizationId: number, params: any = {}): Promise<any> {
        try {
            logger.debug('Getting job posts by organization', { organizationId, params });

            const where = { organizationId };
            return await this.findAll(params, where);
        } catch (error) {
            logger.error('Error getting job posts by organization', { error, organizationId, params });
            throw error;
        }
    }

    /**
     * Get job posts by user (recruiter)
     */
    public async getJobPostsByUser(userId: bigint, params: any = {}): Promise<any> {
        try {
            logger.debug('Getting job posts by user', { userId: userId.toString(), params });

            const where = { userId };
            return await this.findAll(params, where);
        } catch (error) {
            logger.error('Error getting job posts by user', { error, userId: userId.toString(), params });
            throw error;
        }
    }

    /**
     * Search job posts
     */
    public async searchJobPosts(query: string, params: any = {}): Promise<any> {
        try {
            logger.debug('Searching job posts', { query, params });

            const where = {
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { jobCategory: { contains: query, mode: 'insensitive' } },
                    { jobSkill: { contains: query, mode: 'insensitive' } },
                    { city: { contains: query, mode: 'insensitive' } },
                    { state: { contains: query, mode: 'insensitive' } },
                ],
            };

            return await this.findAll(params, where);
        } catch (error) {
            logger.error('Error searching job posts', { error, query, params });
            throw error;
        }
    }

    /**
     * Get job post by slug
     */
    public async getJobPostBySlug(slug: string): Promise<IJobPost | null> {
        try {
            logger.debug('Getting job post by slug', { slug });

            const job = await this.findOneByCriteria({ slug });
            return job;
        } catch (error) {
            logger.error('Error getting job post by slug', { error, slug });
            throw error;
        }
    }

    /**
     * Get job post statistics
     */
    public async getJobPostStats(organizationId: number): Promise<{
        totalJobs: number;
        activeJobs: number;
        draftJobs: number;
        closedJobs: number;
    }> {
        try {
            logger.debug('Getting job post statistics', { organizationId });

            const [totalJobs, activeJobs, draftJobs, closedJobs] = await Promise.all([
                this.prisma.jobPost.count({ where: { organizationId } }),
                this.prisma.jobPost.count({
                    where: {
                        organizationId,
                        jobPostingStatus: 'active'
                    }
                }),
                this.prisma.jobPost.count({
                    where: {
                        organizationId,
                        jobPostingStatus: 'draft'
                    }
                }),
                this.prisma.jobPost.count({
                    where: {
                        organizationId,
                        jobPostingStatus: 'closed'
                    }
                }),
            ]);

            return {
                totalJobs,
                activeJobs,
                draftJobs,
                closedJobs,
            };
        } catch (error) {
            logger.error('Error getting job post statistics', { error, organizationId });
            throw error;
        }
    }

    /**
     * Generate slug from job name
     */
    private generateSlug(name: string): string {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
            .trim()
            .substring(0, 100); // Limit to 100 characters
    }
} 