import { Request, Response } from 'express';
import multer from "multer";
import csv from "csv-parser";
import { Readable } from "stream";
import { ApplicationService } from '../services/application.service';
import logger from '../utils/logger';
import { serializeUser, serializeForJSON, serializeEntityResponse, serializeEntitiesResponse } from '../utils/serializer';

/**
 * Helper function to parse CSV buffer
 */
async function parseCSVFile(buffer: Buffer): Promise<any[]> {
    return new Promise((resolve, reject) => {
        const results: any[] = [];
        const stream = Readable.from(buffer);

        stream
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', (error) => reject(error));
    });
}

export class ApplicationController {
    private applicationService: ApplicationService;

    constructor(applicationService: ApplicationService) {
        this.applicationService = applicationService;
    }

    /**
     * Create bulk applications for candidates (JSON data)
     * SRP: Single responsibility for handling bulk application creation requests
     */
    public async createBulkApplications(req: Request, res: Response): Promise<void> {
        try {
            console.log(req.body);
            const { jobId, candidateEmails, candidateDetails, notes } = req.body;
            const recruiterId = BigInt(req.user!.userId);

            // Fetch user to get organizationId - we'll get this from the service
            const result = await this.applicationService.createBulkApplications(
                { jobId, candidateEmails, candidateDetails, notes },
                recruiterId,
                0 // We'll let the service handle organizationId lookup
            );

            res.status(200).json({
                success: true,
                data: serializeForJSON({
                    ...result,
                    results: result.results.map(r => ({
                        ...r,
                        applicationId: r.applicationId ? serializeUser({ id: r.applicationId }) : undefined
                    }))
                }),
                message: `Bulk application creation completed. ${result.successful} successful, ${result.failed} failed.`
            });

        } catch (error) {
            logger.error('Error in createBulkApplications controller', { error, userId: req.user?.userId });

            const errorMessage = error instanceof Error ? error.message : 'Internal server error';
            const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;

            res.status(statusCode).json({
                success: false,
                error: statusCode === 404 ? 'Not found' : 'Internal server error',
                message: errorMessage
            });
        }
    }

    /**
     * Create bulk applications for candidates (CSV file upload)
     * SRP: Single responsibility for handling CSV file upload and bulk application creation
     */
    public async createBulkApplicationsFromCSV(req: Request, res: Response): Promise<void> {
        try {
            if (!req.file) {
                res.status(400).json({
                    success: false,
                    error: 'Bad request',
                    message: 'CSV file is required'
                });
                return;
            }

            const jobId = req.body['jobId'];
            const notes = req.body['notes'];
            const recruiterId = BigInt(req.user!.userId);

            if (!jobId) {
                res.status(400).json({
                    success: false,
                    error: 'Bad request',
                    message: 'Job ID is required'
                });
                return;
            }

            // Parse CSV file
            const csvData = await parseCSVFile(req.file.buffer);

            // Extract candidate emails and details
            const candidateEmails = csvData.map(row => row.email);
            const candidateDetails = csvData.map(row => ({
                email: row.email,
                firstName: row.firstName,
                lastName: row.lastName,
                phoneNumber: row.phoneNumber,
                location: row.location,
                skills: row.skills,
                education: row.education,
                experience: row.experience,
                resumeUrl: row.resumeUrl,
                portfolioUrl: row.portfolioUrl,
                linkedInUrl: row.linkedInUrl,
                githubUrl: row.githubUrl,
                desiredJobTitle: row.desiredJobTitle,
                preferredWorkLocation: row.preferredWorkLocation,
                salaryExpectation: row.salaryExpectation ? parseInt(row.salaryExpectation) : undefined,
                noticePeriod: row.noticePeriod,
                workAuthorization: row.workAuthorization,
                linkedInProfile: row.linkedInProfile,
                preferredJobType: row.preferredJobType,
                languagesSpoken: row.languagesSpoken
            } as any));

            logger.info('Processing CSV file upload', {
                jobId,
                candidateCount: candidateEmails.length,
                fileName: req.file.originalname
            });

            const result = await this.applicationService.createBulkApplications(
                { jobId: parseInt(jobId), candidateEmails, candidateDetails, notes },
                recruiterId,
                0 // We'll let the service handle organizationId lookup
            );

            res.status(200).json({
                success: true,
                data: serializeForJSON({
                    ...result,
                    results: result.results.map(r => ({
                        ...r,
                        applicationId: r.applicationId ? serializeUser({ id: r.applicationId }) : undefined
                    }))
                }),
                message: `Bulk application creation completed. ${result.successful} successful, ${result.failed} failed.`
            });

        } catch (error) {
            logger.error('Error in createBulkApplicationsFromCSV controller', { error, userId: req.user?.userId });

            const errorMessage = error instanceof Error ? error.message : 'Internal server error';
            const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;

            res.status(statusCode).json({
                success: false,
                error: statusCode === 404 ? 'Not found' : 'Internal server error',
                message: errorMessage
            });
        }
    }

    /**
     * Get applications by job ID
     * SRP: Single responsibility for handling application retrieval requests
     */
    public async getApplicationsByJob(req: Request, res: Response): Promise<void> {
        try {
            const jobId = parseInt(req.params.jobId);
            const recruiterId = BigInt(req.user!.userId);

            const { page, limit, sortBy, sortOrder } = req.query;
            const pagination = {
                page: page ? parseInt(page as string) : 1,
                limit: limit ? parseInt(limit as string) : 10,
                sortBy: sortBy as string || 'createdAt',
                sortOrder: sortOrder as 'asc' | 'desc' || 'desc'
            };

            const result = await this.applicationService.getApplicationsByJob(
                jobId,
                recruiterId,
                pagination
            );

            res.status(200).json({
                success: true,
                data: serializeForJSON(result),
                message: 'Applications retrieved successfully'
            });

        } catch (error) {
            logger.error('Error in getApplicationsByJob controller', { error, userId: req.user?.userId });

            const errorMessage = error instanceof Error ? error.message : 'Internal server error';
            const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;

            res.status(statusCode).json({
                success: false,
                error: statusCode === 404 ? 'Not found' : 'Internal server error',
                message: errorMessage
            });
        }
    }

    /**
     * Update application status
     * SRP: Single responsibility for handling application status update requests
     */
    public async updateApplicationStatus(req: Request, res: Response): Promise<void> {
        try {
            const applicationId = BigInt(req.params.id);
            const recruiterId = BigInt(req.user!.userId);
            const updateData = req.body;

            const result = await this.applicationService.updateApplicationStatus(
                applicationId,
                recruiterId,
                updateData
            );

            res.status(200).json({
                success: true,
                data: serializeForJSON({
                    ...result,
                    candidate: serializeUser(result.candidate)
                }),
                message: 'Application status updated successfully'
            });

        } catch (error) {
            logger.error('Error in updateApplicationStatus controller', { error, userId: req.user?.userId });

            const errorMessage = error instanceof Error ? error.message : 'Internal server error';
            const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;

            res.status(statusCode).json({
                success: false,
                error: statusCode === 404 ? 'Not found' : 'Internal server error',
                message: errorMessage
            });
        }
    }

    /**
     * Get application by ID
     * SRP: Single responsibility for handling single application retrieval requests
     */
    public async getApplicationById(req: Request, res: Response): Promise<void> {
        try {
            const applicationId = BigInt(req.params.id);
            const recruiterId = BigInt(req.user!.userId);

            const application = await this.applicationService.findOneByCriteria({
                id: applicationId,
                recruiterId
            });

            if (!application) {
                res.status(404).json({
                    success: false,
                    error: 'Not found',
                    message: 'Application not found or you do not have permission to view it'
                });
                return;
            }

            res.status(200).json({
                success: true,
                data: serializeEntityResponse(application),
                message: 'Application retrieved successfully'
            });

        } catch (error) {
            logger.error('Error in getApplicationById controller', { error, userId: req.user?.userId });

            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: 'Failed to retrieve application'
            });
        }
    }

    /**
     * Get all applications for a recruiter
     * SRP: Single responsibility for handling recruiter's applications retrieval requests
     */
    public async getRecruiterApplications(req: Request, res: Response): Promise<void> {
        try {
            const recruiterId = BigInt(req.user!.userId);
            console.log('recruierId', recruiterId);
            const { page, limit, sortBy, sortOrder, status } = req.query;
            const pagination = {
                page: page ? parseInt(page as string) : 1,
                limit: limit ? parseInt(limit as string) : 10,
                sortBy: sortBy as string || 'createdAt',
                sortOrder: sortOrder as 'asc' | 'desc' || 'desc'
            };

            const whereClause: any = { recruiterId };
            if (status) {
                whereClause.status = status;
            }

            const [applications, total] = await Promise.all([
                this.applicationService.findMany(whereClause, pagination),
                this.applicationService.count(whereClause)
            ]);

            const totalPages = Math.ceil(total / pagination.limit);

            res.status(200).json({
                success: true,
                data: serializeForJSON({
                    applications: applications.map(app => ({
                        ...app,
                        candidate: serializeUser(app.candidate)
                    })),
                    pagination: {
                        page: pagination.page,
                        limit: pagination.limit,
                        total,
                        totalPages,
                        hasNext: pagination.page < totalPages,
                        hasPrev: pagination.page > 1
                    }
                }),
                message: 'Applications retrieved successfully'
            });

        } catch (error) {
            logger.error('Error in getRecruiterApplications controller', { error, userId: req.user?.userId });

            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: 'Failed to retrieve applications'
            });
        }
    }

    /**
     * Get application statistics
     * SRP: Single responsibility for handling application statistics requests
     */
    public async getApplicationStats(req: Request, res: Response): Promise<void> {
        try {
            const recruiterId = BigInt(req.user!.userId);

            const stats = await this.applicationService.getApplicationStats(recruiterId);

            res.status(200).json({
                success: true,
                data: serializeForJSON(stats),
                message: 'Application statistics retrieved successfully'
            });

        } catch (error) {
            logger.error('Error in getApplicationStats controller', { error, userId: req.user?.userId });

            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: 'Failed to retrieve application statistics'
            });
        }
    }

    /**
     * Delete application (soft delete)
     * SRP: Single responsibility for handling application deletion requests
     */
    public async deleteApplication(req: Request, res: Response): Promise<void> {
        try {
            const applicationId = BigInt(req.params.id);
            const recruiterId = BigInt(req.user!.userId);

            // Verify application belongs to recruiter
            const application = await this.applicationService.findOneByCriteria({
                id: applicationId,
                recruiterId
            });

            if (!application) {
                res.status(404).json({
                    success: false,
                    error: 'Not found',
                    message: 'Application not found or you do not have permission to delete it'
                });
                return;
            }

            await this.applicationService.delete(applicationId.toString());

            res.status(200).json({
                success: true,
                message: 'Application deleted successfully'
            });

        } catch (error) {
            logger.error('Error in deleteApplication controller', { error, userId: req.user?.userId });

            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: 'Failed to delete application'
            });
        }
    }

    public async getOrganizationApplications(req: Request, res: Response): Promise<void> {
        try {
            const recruiterId = BigInt(req.user!.userId);
            const applications = await this.applicationService.getOrganizationApplications(recruiterId);

            res.status(200).json({
                success: true,
                data: serializeForJSON(applications),
                message: 'Applications retrieved successfully'
            });
        } catch (error) {
            logger.error('Error in getOrganizationApplications controller', { error, userId: req.user?.userId });

            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: 'Failed to retrieve applications'
            });
        }
    }
} 