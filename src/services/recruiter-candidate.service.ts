import { PrismaClient, User, Application, JobPost, Organization, Interview } from '@prisma/client';
import logger from '../utils/logger';
import { EmailService } from './email.service';
import { InterviewService } from './interview.service';
import { getCurrentUTC, addDaysUTC, parseTimeString, addMinutesUTC } from '../utils/datetime';
import { ApplicationWithDetails } from './candidate.service';

export interface CandidateWithApplications extends User {
    applications: (Application & {
        job: JobPost & {
            organization: Organization;
        };
        organization: Organization;
        interviews: Interview[];
    })[];
    candidateDetails: any;
}

export interface BulkAssignmentResult {
    successful: number;
    failed: number;
    results: Array<{
        email: string;
        success: boolean;
        message: string;
        interviewId?: bigint;
        applicationId?: bigint;
    }>;
}

export interface BulkAssignmentInput {
    jobId: number;
    csv: Array<{ email: string;[key: string]: any }>;
    numberOfDays: number;
    startTime: string; // HH:mm format
    endTime: string;   // HH:mm format
    interviewType: 'coding' | 'technical' | 'behavioral' | 'system_design' | 'case_study';
    durationMinutes: number;
    notes?: string;
}

export class RecruiterCandidateService {
    private emailService: EmailService;
    private interviewService: InterviewService;

    constructor(private prisma: PrismaClient) {
        this.emailService = new EmailService();
        this.interviewService = new InterviewService(prisma);
    }

    /**
     * Get candidate details by email (recruiter access)
     * Only returns candidates from the recruiter's organization
     */
    async getCandidateByEmail(email: string, recruiterId: number): Promise<User & { candidateDetails: any }> {
        try {
            // Get recruiter's organization
            const recruiter = await this.prisma.user.findUnique({
                where: { id: BigInt(recruiterId) },
                select: { organizationId: true }
            });

            if (!recruiter?.organizationId) {
                throw new Error('Recruiter not associated with any organization');
            }

            // Find candidate by email
            const candidate = await this.prisma.user.findFirst({
                where: {
                    email: email.toLowerCase(),
                    userType: 'CANDIDATE',
                    deletedAt: null,
                    // Only return candidates that have applications to jobs in recruiter's organization
                    applications: {
                        some: {
                            job: {
                                organizationId: recruiter.organizationId
                            }
                        }
                    }
                },
                include: {
                    candidateDetails: true
                }
            });

            if (!candidate) {
                throw new Error('Candidate not found or not accessible');
            }

            return candidate;
        } catch (error) {
            logger.error('Error fetching candidate by email:', error);
            throw error;
        }
    }

    /**
     * Get candidate details with applications (recruiter access)
     * Only returns applications that belong to the recruiter's organization
     */
    async getCandidateWithApplications(candidateId: number, recruiterId: number): Promise<CandidateWithApplications> {
        try {
            // Get recruiter's organization
            const recruiter = await this.prisma.user.findUnique({
                where: { id: BigInt(recruiterId) },
                select: { organizationId: true }
            });

            if (!recruiter?.organizationId) {
                throw new Error('Recruiter not associated with any organization');
            }

            // Find candidate with applications
            const candidate = await this.prisma.user.findFirst({
                where: {
                    id: BigInt(candidateId),
                    userType: 'candidate',
                    deletedAt: null,
                    applications: {
                        some: {
                            job: {
                                organizationId: recruiter.organizationId
                            }
                        }
                    }
                },
                include: {
                    candidateDetails: true,
                    applications: {
                        where: {
                            job: {
                                organizationId: recruiter.organizationId
                            }
                        },
                        include: {
                            job: {
                                include: {
                                    organization: true
                                }
                            },
                            organization: true,
                            interviews: {
                                orderBy: {
                                    scheduledAt: 'desc'
                                }
                            }
                        },
                        orderBy: {
                            applicationDate: 'desc'
                        }
                    }
                }
            });

            if (!candidate) {
                throw new Error('Candidate not found or not accessible');
            }

            return candidate;
        } catch (error) {
            logger.error('Error fetching candidate with applications:', error);
            throw error;
        }
    }

    /**
     * Get candidate details with applications by email (recruiter access)
     * Only returns applications that belong to the recruiter's organization
     */
    async getCandidateWithApplicationsByEmail(email: string, recruiterId: number): Promise<CandidateWithApplications> {
        try {
            // Get recruiter's organization
            const recruiter = await this.prisma.user.findUnique({
                where: { id: BigInt(recruiterId) },
                select: { organizationId: true }
            });

            if (!recruiter?.organizationId) {
                throw new Error('Recruiter not associated with any organization');
            }

            // Find candidate with applications by email
            const candidate = await this.prisma.user.findFirst({
                where: {
                    email: email.toLowerCase(),
                    userType: 'CANDIDATE',
                    deletedAt: null,
                    applications: {
                        some: {
                            job: {
                                organizationId: recruiter.organizationId
                            }
                        }
                    }
                },
                include: {
                    candidateDetails: true,
                    applications: {
                        where: {
                            job: {
                                organizationId: recruiter.organizationId
                            }
                        },
                        include: {
                            job: {
                                include: {
                                    organization: true
                                }
                            },
                            organization: true,
                            interviews: {
                                orderBy: {
                                    scheduledAt: 'desc'
                                }
                            }
                        },
                        orderBy: {
                            applicationDate: 'desc'
                        }
                    }
                }
            });

            if (!candidate) {
                throw new Error('Candidate not found or not accessible');
            }

            return candidate;
        } catch (error) {
            logger.error('Error fetching candidate with applications by email:', error);
            throw error;
        }
    }

    /**
     * Bulk assign candidates to interviews with intelligent scheduling
     */
    async bulkAssignCandidates(input: BulkAssignmentInput, recruiterId: number): Promise<BulkAssignmentResult> {
        try {
            // Get recruiter's organization
            const recruiter = await this.prisma.user.findUnique({
                where: { id: BigInt(recruiterId) },
                select: { organizationId: true }
            });

            if (!recruiter?.organizationId) {
                throw new Error('Recruiter not associated with any organization');
            }

            // Verify job exists and belongs to recruiter's organization
            const job = await this.prisma.jobPost.findFirst({
                where: {
                    id: input.jobId,
                    organizationId: recruiter.organizationId
                }
            });

            if (!job) {
                throw new Error('Job not found or not accessible');
            }

            // Calculate scheduling parameters
            const { timeSlots, parallelInterviews } = this.calculateSchedulingParameters(input);

            logger.info('Bulk assignment scheduling calculated', {
                totalCandidates: input.csv.length,
                numberOfDays: input.numberOfDays,
                timeSlots: timeSlots.length,
                parallelInterviews
            });

            const results: Array<{
                email: string;
                success: boolean;
                message: string;
                interviewId?: bigint;
                applicationId?: bigint;
            }> = [];

            let successful = 0;
            let failed = 0;

            // Process candidates asynchronously using streaming approach
            const candidateChunks = this.chunkArray(input.csv, parallelInterviews);

            for (let dayIndex = 0; dayIndex < input.numberOfDays; dayIndex++) {
                const currentDate = addDaysUTC(getCurrentUTC(), dayIndex);

                for (let slotIndex = 0; slotIndex < timeSlots.length; slotIndex++) {
                    const timeSlot = timeSlots[slotIndex];
                    const slotStartTime = this.combineDateTime(currentDate, timeSlot.start);
                    const slotEndTime = addMinutesUTC(slotStartTime, input.durationMinutes);

                    // Get candidates for this slot
                    const candidatesForSlot = candidateChunks[slotIndex] || [];

                    if (candidatesForSlot.length === 0) continue;

                    // Process candidates for this slot in parallel
                    const slotPromises = candidatesForSlot.map(async (candidate, candidateIndex) => {
                        try {
                            const result = await this.processCandidateAssignment(
                                candidate,
                                input.jobId,
                                slotStartTime,
                                slotEndTime,
                                input.interviewType,
                                input.durationMinutes,
                                input.notes,
                                recruiter.organizationId
                            );

                            results.push({
                                email: candidate.email,
                                success: true,
                                message: 'Interview scheduled successfully',
                                interviewId: result.interviewId,
                                applicationId: result.applicationId
                            });

                            successful++;
                        } catch (error) {
                            logger.error('Failed to process candidate assignment:', {
                                email: candidate.email,
                                error: error instanceof Error ? error.message : 'Unknown error'
                            });

                            results.push({
                                email: candidate.email,
                                success: false,
                                message: error instanceof Error ? error.message : 'Unknown error'
                            });

                            failed++;
                        }
                    });

                    // Wait for all candidates in this slot to be processed
                    await Promise.all(slotPromises);
                }
            }

            // Send bulk notification emails asynchronously
            this.sendBulkAssignmentNotifications(results, input.jobId, job.name).catch(error => {
                logger.error('Failed to send bulk assignment notifications:', error);
            });

            return {
                successful,
                failed,
                results
            };

        } catch (error) {
            logger.error('Error in bulk assign candidates:', error);
            throw error;
        }
    }

    /**
     * Calculate scheduling parameters based on input
     */
    private calculateSchedulingParameters(input: BulkAssignmentInput): {
        timeSlots: Array<{ start: string; end: string }>;
        parallelInterviews: number;
    } {
        const startTime = parseTimeString(input.startTime);
        const endTime = parseTimeString(input.endTime);

        // Calculate available time in minutes
        const startMinutes = startTime.hours * 60 + startTime.minutes;
        const endMinutes = endTime.hours * 60 + endTime.minutes;
        const availableMinutes = endMinutes - startMinutes;

        // Calculate slots per day
        const slotsPerDay = Math.floor(availableMinutes / input.durationMinutes);
        const totalSlots = slotsPerDay * input.numberOfDays;

        // Calculate parallel interviews needed
        const parallelInterviews = Math.ceil(input.csv.length / totalSlots);

        // Generate time slots
        const timeSlots: Array<{ start: string; end: string }> = [];
        for (let i = 0; i < slotsPerDay; i++) {
            const slotStartMinutes = startMinutes + (i * input.durationMinutes);
            const slotEndMinutes = slotStartMinutes + input.durationMinutes;

            if (slotEndMinutes <= endMinutes) {
                const startHours = Math.floor(slotStartMinutes / 60);
                const startMins = slotStartMinutes % 60;
                const endHours = Math.floor(slotEndMinutes / 60);
                const endMins = slotEndMinutes % 60;

                timeSlots.push({
                    start: `${startHours.toString().padStart(2, '0')}:${startMins.toString().padStart(2, '0')}`,
                    end: `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`
                });
            }
        }

        return { timeSlots, parallelInterviews };
    }

    /**
     * Process individual candidate assignment
     */
    private async processCandidateAssignment(
        candidate: { email: string;[key: string]: any },
        jobId: number,
        scheduledAt: Date,
        scheduledEnd: Date,
        interviewType: string,
        durationMinutes: number,
        notes?: string,
        organizationId: number
    ): Promise<{ interviewId: bigint; applicationId: bigint }> {
        // Find or create application
        let application = await this.prisma.application.findFirst({
            where: {
                candidate: {
                    email: candidate.email.toLowerCase()
                },
                jobId: jobId,
                deletedAt: null
            }
        });

        if (!application) {
            // Create application if it doesn't exist
            const candidateUser = await this.prisma.user.findFirst({
                where: {
                    email: candidate.email.toLowerCase(),
                    userType: 'candidate'
                }
            });

            if (!candidateUser) {
                throw new Error(`Candidate with email ${candidate.email} not found`);
            }

            application = await this.prisma.application.create({
                data: {
                    candidateId: candidateUser.id,
                    jobId: jobId,
                    organizationId: organizationId,
                    recruiterId: BigInt(0), // Will be set by the service
                    status: 'applied',
                    applicationDate: getCurrentUTC(),
                    notes: notes
                }
            });
        }

        // Create interview
        const interview = await this.prisma.interview.create({
            data: {
                applicationId: application.id,
                scheduledAt: scheduledAt,
                mode: 'live',
                durationMinutes: durationMinutes,
                timezone: 'UTC',
                interviewType: interviewType as any,
                timeSlotStart: scheduledAt,
                timeSlotEnd: scheduledEnd,
                status: 'pending',
                createdBy: BigInt(0), // Will be set by the service
                notes: notes
            }
        });

        return {
            interviewId: interview.id,
            applicationId: application.id
        };
    }

    /**
     * Send bulk assignment notifications asynchronously
     */
    private async sendBulkAssignmentNotifications(
        results: Array<{ email: string; success: boolean; message: string; interviewId?: bigint }>,
        jobId: number,
        jobTitle: string
    ): Promise<void> {
        try {
            const successfulAssignments = results.filter(r => r.success);

            for (const assignment of successfulAssignments) {
                try {
                    await this.emailService.sendInterviewScheduledEmail(
                        assignment.email,
                        jobTitle,
                        assignment.interviewId?.toString() || '',
                        'Your interview has been scheduled'
                    );
                } catch (error) {
                    logger.error('Failed to send email notification:', {
                        email: assignment.email,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            }
        } catch (error) {
            logger.error('Error sending bulk assignment notifications:', error);
        }
    }

    /**
     * Utility method to chunk array into smaller arrays
     */
    private chunkArray<T>(array: T[], size: number): T[][] {
        const chunks: T[][] = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

    /**
     * Utility method to combine date and time string
     */
    private combineDateTime(date: Date, timeString: string): Date {
        const [hours, minutes] = timeString.split(':').map(Number);
        const combined = new Date(date);
        combined.setHours(hours, minutes, 0, 0);
        return combined;
    }

    public async getCandidateApplicationById(applicationId: number, recruiterId: number): Promise<ApplicationWithDetails> {
        try {
            const application = await this.prisma.application.findUnique({
                where: { id: applicationId }
            });

            if (!application) {
                throw new Error('Application not found');
            }

            const applicationWithDetails = await this.prisma.application.findUnique({
                where: { id: applicationId },
                include: {
                    job: true,
                    organization: true,
                }
            });

            return applicationWithDetails;
        } catch (error) {
            logger.error('Error in getCandidateApplicationById:', error);
            throw error;
        }
    }
}
