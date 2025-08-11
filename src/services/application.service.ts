import { PrismaClient } from '@prisma/client';
import { BaseService } from './base.service';
import { EmailService } from './email.service';
import { AuthService } from './auth.service';
import {
    IApplication,
    ICreateApplicationInput,
    IUpdateApplicationInput,
    ICsvCandidateData,
    IApplicationResult,
    IBulkApplicationResult,
    PaginationParams,
    PaginatedResponse
} from '../types';
import logger from '../utils/logger';
import { AuthUtils } from '../utils/auth';
import { serializeUser } from '../utils/serializer';
import { getCurrentUTC, addDaysUTC, addHoursUTC } from '../utils/datetime';
import { DsaQuestionService } from './dsa-question.service';

export class ApplicationService extends BaseService<IApplication, ICreateApplicationInput, IUpdateApplicationInput> {
    private emailService: EmailService;
    private authService: AuthService;
    private dsaQuestionService: DsaQuestionService;

    constructor(prisma: PrismaClient, emailService: EmailService, authService: AuthService) {
        super(prisma, 'application');
        this.emailService = emailService;
        this.authService = authService;
        this.dsaQuestionService = new DsaQuestionService(prisma);
    }

    /**
     * Create applications for multiple candidates
     * SRP: Single responsibility for bulk application creation
     */
    public async createBulkApplications(
        input: ICreateApplicationInput & {
            autoCreateInterview?: {
                scheduledAt: Date;
                mode: 'live' | 'async';
                durationMinutes: number;
                timezone: string;
                interviewType: 'coding' | 'technical' | 'behavioral' | 'system_design' | 'case_study';
                timeSlotStart: Date;
                timeSlotEnd: Date;
                notes?: string;
            };
        },
        recruiterId: bigint,
        organizationId: number = 0
    ): Promise<IBulkApplicationResult> {
        try {
            // If organizationId is 0, fetch it from the user
            let actualOrganizationId = organizationId;
            if (organizationId === 0) {
                const user = await this.prisma.user.findUnique({
                    where: { id: recruiterId },
                    select: { organizationId: true }
                });

                if (!user?.organizationId) {
                    throw new Error('Organization ID is required for creating applications');
                }
                actualOrganizationId = user.organizationId;
            }

            logger.info('Starting bulk application creation', {
                jobId: input.jobId,
                candidateCount: input.candidateEmails.length,
                recruiterId: recruiterId.toString(),
                organizationId: actualOrganizationId
            });

            // Verify job exists and recruiter has permission
            const job = await this.prisma.jobPost.findFirst({
                where: {
                    id: input.jobId,
                    userId: recruiterId,
                    organizationId: actualOrganizationId
                }
            });

            if (!job) {
                throw new Error('Job not found or you do not have permission to create applications for this job');
            }

            const results: IApplicationResult[] = [];
            let successful = 0;
            let failed = 0;

            // Process each candidate email
            for (const email of input.candidateEmails) {
                try {
                    const result = await this.processCandidateApplication(
                        email,
                        input.jobId,
                        recruiterId,
                        actualOrganizationId,
                        input.candidateDetails?.find(d => d.email === email),
                        input.notes,
                        input.autoCreateInterview
                    );
                    results.push(result);
                    if (result.success) {
                        successful++;
                    } else {
                        failed++;
                    }
                } catch (error) {
                    logger.error('Error processing candidate application', { email, error });
                    results.push({
                        success: false,
                        candidateEmail: email,
                        message: `Error processing application: ${error instanceof Error ? error.message : 'Unknown error'}`
                    });
                    failed++;
                }
            }

            const bulkResult: IBulkApplicationResult = {
                totalProcessed: input.candidateEmails.length,
                successful,
                failed,
                results
            };

            logger.info('Bulk application creation completed', bulkResult);
            return bulkResult;

        } catch (error) {
            logger.error('Error in bulk application creation', { error, input });
            throw error;
        }
    }

    /**
     * Process individual candidate application
     * SRP: Single responsibility for processing single candidate application
     */
    private async processCandidateApplication(
        email: string,
        jobId: number,
        recruiterId: bigint,
        organizationId: number,
        candidateDetails?: ICsvCandidateData,
        notes?: string,
        autoCreateInterview?: {
            scheduledAt: Date;
            mode: 'live' | 'async';
            durationMinutes: number;
            timezone: string;
            interviewType: 'coding' | 'technical' | 'behavioral' | 'system_design' | 'case_study';
            timeSlotStart: Date;
            timeSlotEnd: Date;
            notes?: string;
        }
    ): Promise<IApplicationResult> {
        try {
            // Check if candidate already exists
            const existingCandidate = await this.prisma.user.findUnique({
                where: { email }
            });

            let candidateId: bigint;
            let isNewUser = false;

            if (existingCandidate) {
                // Existing candidate - create application directly
                candidateId = existingCandidate.id;

                // Check if application already exists
                const existingApplication = await this.prisma.application.findUnique({
                    where: {
                        jobId_candidateId: {
                            jobId,
                            candidateId
                        }
                    }
                });

                if (existingApplication) {
                    return {
                        success: false,
                        candidateEmail: email,
                        message: 'Application already exists for this candidate and job'
                    };
                }

                // Create application for existing candidate
                const application = await this.prisma.application.create({
                    data: {
                        jobId,
                        candidateId,
                        recruiterId,
                        organizationId,
                        notes: notes || null,
                        status: 'PENDING'
                    }
                });

                // Always create interview with pending status
                const interview = await this.prisma.interview.create({
                    data: {
                        applicationId: application.id,
                        scheduledAt: autoCreateInterview?.scheduledAt || addDaysUTC(getCurrentUTC(), 7), // Default to 7 days from now
                        mode: autoCreateInterview?.mode || 'live',
                        durationMinutes: autoCreateInterview?.durationMinutes || 60,
                        timezone: autoCreateInterview?.timezone || 'UTC',
                        status: 'pending',
                        interviewType: autoCreateInterview?.interviewType || 'technical',
                        timeSlotStart: autoCreateInterview?.timeSlotStart || addDaysUTC(getCurrentUTC(), 7),
                        timeSlotEnd: autoCreateInterview?.timeSlotEnd || addHoursUTC(addDaysUTC(getCurrentUTC(), 7), 1), // 1 hour later
                        createdBy: recruiterId,
                    }
                });

                // Automatically assign 2 DSA questions if it's a coding interview
                if (autoCreateInterview?.interviewType === 'coding') {
                    try {
                        const randomQuestions = await this.dsaQuestionService.getRandomQuestions(2);
                        if (randomQuestions.length > 0) {
                            const questionIds = randomQuestions.map(q => Number(q.id));
                            await this.dsaQuestionService.assignQuestionsToInterview(Number(interview.id), questionIds);
                        }
                    } catch (error) {
                        logger.warn('Failed to assign DSA questions to interview', {
                            interviewId: interview.id.toString(),
                            error: error instanceof Error ? error.message : 'Unknown error'
                        });
                    }
                }

                // Send interview invitation email if scheduled
                if (autoCreateInterview) {
                    const candidate = await this.prisma.user.findUnique({
                        where: { id: candidateId }
                    });

                    if (candidate) {
                        await this.emailService.sendInterviewInvitation(candidate.email, {
                            firstName: candidate.firstName,
                            lastName: candidate.lastName,
                            scheduledAt: autoCreateInterview.scheduledAt,
                            mode: autoCreateInterview.mode,
                            durationMinutes: autoCreateInterview.durationMinutes,
                            timezone: autoCreateInterview.timezone,
                        });
                    }
                }

                // Send application notification to existing candidate
                await this.sendApplicationNotification(email, jobId, application.id, false);

                return {
                    success: true,
                    candidateEmail: email,
                    message: 'Application created successfully for existing candidate',
                    isNewUser: false,
                    userId: candidateId.toString(),
                    applicationId: application.id.toString()
                };

            } else {
                // New candidate - create account and application
                isNewUser = true;

                // Generate random password
                const randomPassword = AuthUtils.generateRandomPassword();

                // Create candidate account
                const candidateData = {
                    email,
                    password: randomPassword,
                    firstName: candidateDetails?.firstName || 'Candidate',
                    lastName: candidateDetails?.lastName || 'User',
                    candidateDetails: {
                        phoneNumber: candidateDetails?.phoneNumber,
                        location: candidateDetails?.location,
                        skills: candidateDetails?.skills,
                        education: candidateDetails?.education,
                        experience: candidateDetails?.experience,
                        resumeUrl: candidateDetails?.resumeUrl,
                        portfolioUrl: candidateDetails?.portfolioUrl,
                        linkedInUrl: candidateDetails?.linkedInUrl,
                        githubUrl: candidateDetails?.githubUrl,
                        desiredJobTitle: candidateDetails?.desiredJobTitle,
                        preferredWorkLocation: candidateDetails?.preferredWorkLocation,
                        salaryExpectation: candidateDetails?.salaryExpectation,
                        noticePeriod: candidateDetails?.noticePeriod,
                        workAuthorization: candidateDetails?.workAuthorization,
                        linkedInProfile: candidateDetails?.linkedInProfile,
                        preferredJobType: candidateDetails?.preferredJobType,
                        languagesSpoken: candidateDetails?.languagesSpoken
                    }
                };

                // Create candidate account in transaction
                const result = await this.prisma.$transaction(async (prisma) => {
                    // Create user with auto-generated password flag
                    const user = await prisma.user.create({
                        data: {
                            email: candidateData.email,
                            password: await AuthUtils.hashPassword(candidateData.password),
                            firstName: candidateData.firstName,
                            lastName: candidateData.lastName,
                            userType: 'CANDIDATE',
                            userRole: 'CANDIDATE',
                            isAutoGeneratedPassword: true
                        }
                    });

                    // Create candidate details
                    const candidateDetailsData: any = {
                        userId: user.id,
                        status: 'ACTIVE'
                    };

                    // Add candidate details if provided
                    if (candidateData.candidateDetails) {
                        Object.entries(candidateData.candidateDetails).forEach(([key, value]) => {
                            if (value !== undefined) {
                                candidateDetailsData[key] = value;
                            }
                        });
                    }

                    await prisma.candidateDetails.create({
                        data: candidateDetailsData
                    });

                    // Create application
                    const application = await prisma.application.create({
                        data: {
                            jobId,
                            candidateId: user.id,
                            recruiterId,
                            organizationId,
                            notes: notes || null,
                            status: 'PENDING'
                        }
                    });

                    // Always create interview with pending status
                    const interview = await prisma.interview.create({
                        data: {
                            applicationId: application.id,
                            scheduledAt: autoCreateInterview?.scheduledAt || addDaysUTC(getCurrentUTC(), 7), // Default to 7 days from now
                            mode: autoCreateInterview?.mode || 'live',
                            durationMinutes: autoCreateInterview?.durationMinutes || 60,
                            timezone: autoCreateInterview?.timezone || 'UTC',
                            status: 'pending',
                            interviewType: autoCreateInterview?.interviewType || 'technical',
                            timeSlotStart: autoCreateInterview?.timeSlotStart || addDaysUTC(getCurrentUTC(), 7),
                            timeSlotEnd: autoCreateInterview?.timeSlotEnd || addHoursUTC(addDaysUTC(getCurrentUTC(), 7), 1), // 1 hour later
                            createdBy: recruiterId,
                        }
                    });

                    // Automatically assign 2 DSA questions if it's a coding interview
                    if (autoCreateInterview?.interviewType === 'coding') {
                        try {
                            const dsaService = new DsaQuestionService(this.prisma);
                            const randomQuestions = await dsaService.getRandomQuestions(2);
                            if (randomQuestions.length > 0) {
                                const questionIds = randomQuestions.map(q => Number(q.id));
                                await dsaService.assignQuestionsToInterview(Number(interview.id), questionIds);
                            }
                        } catch (error) {
                            logger.warn('Failed to assign DSA questions to interview', {
                                interviewId: interview.id.toString(),
                                error: error instanceof Error ? error.message : 'Unknown error'
                            });
                        }
                    }

                    return { user, application };
                });

                candidateId = result.user.id;

                // Send welcome email with credentials to new candidate
                await this.sendWelcomeEmailWithCredentials(
                    email,
                    candidateData.firstName,
                    candidateData.password,
                    jobId,
                    result.application.id
                );

                return {
                    success: true,
                    candidateEmail: email,
                    message: 'Candidate account created and application submitted successfully',
                    isNewUser: true,
                    userId: candidateId.toString(),
                    applicationId: result.application.id.toString()
                };
            }

        } catch (error) {
            logger.error('Error processing candidate application', { email, error });
            throw error;
        }
    }

    /**
     * Send application notification to existing candidate
     * SRP: Single responsibility for sending application notifications
     */
    private async sendApplicationNotification(
        email: string,
        jobId: number,
        applicationId: bigint,
        isNewUser: boolean
    ): Promise<void> {
        try {
            // Skip email sending if SMTP is not configured
            if (!process.env['SMTP_HOST'] || !process.env['SMTP_USER'] || !process.env['SMTP_PASS']) {
                logger.info('Skipping email notification - SMTP not configured', { email, applicationId });
                return;
            }

            const job = await this.prisma.jobPost.findUnique({
                where: { id: jobId },
                include: { organization: true }
            });

            if (!job) {
                logger.error('Job not found for notification', { jobId });
                return;
            }

            const applicationUrl = `${process.env['FRONTEND_URL'] || 'http://localhost:3000'}/applications/${applicationId}`;

            await this.emailService.sendApplicationNotification({
                to: email,
                jobTitle: job.name,
                organizationName: job.organization.name,
                applicationUrl,
                isNewUser
            });

            logger.info('Application notification sent', { email, applicationId });
        } catch (error) {
            logger.error('Error sending application notification', { email, error });
        }
    }

    /**
     * Send welcome email with credentials to new candidate
     * SRP: Single responsibility for sending welcome emails with credentials
     */
    private async sendWelcomeEmailWithCredentials(
        email: string,
        firstName: string,
        password: string,
        jobId: number,
        applicationId: bigint
    ): Promise<void> {
        try {
            // Skip email sending if SMTP is not configured
            if (!process.env['SMTP_HOST'] || !process.env['SMTP_USER'] || !process.env['SMTP_PASS']) {
                logger.info('Skipping welcome email - SMTP not configured', { email, applicationId, password });
                return;
            }

            const job = await this.prisma.jobPost.findUnique({
                where: { id: jobId },
                include: { organization: true }
            });

            if (!job) {
                logger.error('Job not found for welcome email', { jobId });
                return;
            }

            const applicationUrl = `${process.env['FRONTEND_URL'] || 'http://localhost:3000'}/applications/${applicationId}`;

            await this.emailService.sendWelcomeEmailWithCredentials({
                to: email,
                firstName,
                password,
                jobTitle: job.name,
                organizationName: job.organization.name,
                applicationUrl
            });

            logger.info('Welcome email with credentials sent', { email, applicationId });
        } catch (error) {
            logger.error('Error sending welcome email with credentials', { email, error });
        }
    }

    /**
     * Get applications by job ID
     * SRP: Single responsibility for retrieving applications by job
     */
    public async getApplicationsByJob(
        jobId: number,
        recruiterId: bigint,
        pagination: PaginationParams = {}
    ): Promise<PaginatedResponse<IApplication>> {
        try {
            const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
            const skip = (page - 1) * limit;

            // Verify job belongs to recruiter
            const job = await this.prisma.jobPost.findFirst({
                where: {
                    id: jobId,
                    userId: recruiterId
                }
            });

            if (!job) {
                throw new Error('Job not found or you do not have permission to view applications');
            }

            const [applications, total] = await Promise.all([
                this.prisma.application.findMany({
                    where: { jobId },
                    include: {
                        candidate: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                                candidateDetails: {
                                    select: {
                                        phoneNumber: true,
                                        location: true,
                                        skills: true
                                    }
                                }
                            }
                        },
                        job: {
                            select: {
                                id: true,
                                name: true,
                                organization: {
                                    select: {
                                        id: true,
                                        name: true
                                    }
                                }
                            }
                        },
                        organization: {
                            select: {
                                id: true,
                                name: true,
                                description: true,
                                website: true,
                                industry: true,
                                size: true,
                                location: true
                            }
                        }
                    },
                    orderBy: { [sortBy]: sortOrder },
                    skip,
                    take: limit
                }),
                this.prisma.application.count({
                    where: { jobId }
                })
            ]);

            const totalPages = Math.ceil(total / limit);

            return {
                data: applications.map(app => ({
                    ...app,
                    candidate: serializeUser(app.candidate)
                })),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                }
            };

        } catch (error) {
            logger.error('Error getting applications by job', { jobId, error });
            throw error;
        }
    }

    /**
     * Update application status
     * SRP: Single responsibility for updating application status
     */
    public async updateApplicationStatus(
        applicationId: bigint,
        recruiterId: bigint,
        updateData: IUpdateApplicationInput
    ): Promise<IApplication> {
        try {
            // Verify application belongs to recruiter
            const application = await this.prisma.application.findFirst({
                where: {
                    id: applicationId,
                    recruiterId
                },
                include: {
                    candidate: true,
                    job: {
                        include: { organization: true }
                    }
                }
            });

            if (!application) {
                throw new Error('Application not found or you do not have permission to update it');
            }

            const updatedApplication = await this.prisma.application.update({
                where: { id: applicationId },
                data: updateData,
                include: {
                    candidate: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true
                        }
                    },
                    job: {
                        select: {
                            id: true,
                            name: true,
                            organization: {
                                select: {
                                    id: true,
                                    name: true
                                }
                            }
                        }
                    }
                }
            });

            // Send status update notification
            if (updateData.status && updateData.status !== application.status) {
                await this.sendStatusUpdateNotification(
                    application.candidate.email,
                    application.candidate.firstName,
                    updateData.status,
                    application.job.name,
                    application.job.organization.name
                );
            }

            logger.info('Application status updated', { applicationId, status: updateData.status });
            return updatedApplication;

        } catch (error) {
            logger.error('Error updating application status', { applicationId, error });
            throw error;
        }
    }

    /**
     * Send status update notification
     * SRP: Single responsibility for sending status update notifications
     */
    private async sendStatusUpdateNotification(
        email: string,
        firstName: string,
        status: string,
        jobTitle: string,
        organizationName: string
    ): Promise<void> {
        try {
            await this.emailService.sendApplicationStatusUpdate({
                to: email,
                firstName,
                status,
                jobTitle,
                organizationName
            });

            logger.info('Status update notification sent', { email, status });
        } catch (error) {
            logger.error('Error sending status update notification', { email, error });
        }
    }

    /**
     * Get application statistics
     * SRP: Single responsibility for retrieving application statistics
     */
    public async getApplicationStats(recruiterId: bigint): Promise<any> {
        try {
            const stats = await this.prisma.application.groupBy({
                by: ['status'],
                where: {
                    recruiterId
                },
                _count: {
                    status: true
                }
            });

            const totalApplications = await this.prisma.application.count({
                where: { recruiterId }
            });

            const recentApplications = await this.prisma.application.count({
                where: {
                    recruiterId,
                    createdAt: {
                        gte: addDaysUTC(getCurrentUTC(), -7) // Last 7 days
                    }
                }
            });

            return {
                totalApplications,
                recentApplications,
                byStatus: stats.reduce((acc, stat) => {
                    acc[stat.status] = stat._count.status;
                    return acc;
                }, {} as Record<string, number>)
            };

        } catch (error) {
            logger.error('Error getting application stats', { recruiterId, error });
            throw error;
        }
    }

    public async getOrganizationApplications(recruiterId: bigint): Promise<any> {
        try {
            const applications = await this.prisma.application.findMany({
                where: { recruiterId }
            });

            // Add Job Details to the applications
            const applicationsWithJobDetails = await Promise.all(applications.map(async (application) => {
                const job = await this.prisma.jobPost.findUnique({
                    where: { id: application.jobId }
                });
                return { ...application, job };
            }));

            const sendCandidateDetails = await Promise.all(applicationsWithJobDetails.map(async (application) => {
                const candidate = await this.prisma.user.findUnique({
                    where: { id: application.candidateId }
                });
                return { ...application, candidate };
            }));


            // Add Pagination to the applications
            const totalApplications = sendCandidateDetails.length;
            const limit = 10;
            const totalPages = Math.ceil(totalApplications / limit);
            const currentPage = 1;

            return {
                data: sendCandidateDetails,
                pagination: {
                    total: totalApplications,
                    totalPages,
                    currentPage
                }
            };
        } catch (error) {
            logger.error('Error getting organization applications', { organizationId, error });
            throw error;
        }
    }
} 