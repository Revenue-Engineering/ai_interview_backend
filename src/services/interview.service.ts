import { PrismaClient, Interview, Application, User, JobPost, Organization, InterviewQuestion, DsaQuestion, UserCodeSubmission } from '@prisma/client';
import logger from '../utils/logger';
import { ICreateInterviewInput, IUpdateInterviewInput, IInterviewStartValidation, ICreateCodeSubmissionInput } from '../types';
import { getCurrentUTC } from '../utils/datetime';
import axios from 'axios';
import * as fs from 'fs';

export interface CreateInterviewData {
    applicationId: number;
    scheduledAt: Date;
    mode: 'live' | 'async';
    durationMinutes: number;
    timezone: string;
    interviewType: 'coding' | 'technical' | 'behavioral' | 'system_design' | 'case_study';
    timeSlotStart: Date;
    timeSlotEnd: Date;
    notes?: string;
    createdBy: number;
}

export interface UpdateInterviewData {
    scheduledAt?: Date;
    mode?: 'live' | 'async';
    status?: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'expired' | 'cancelled';
    durationMinutes?: number;
    timezone?: string;
    interviewType?: 'coding' | 'technical' | 'behavioral' | 'system_design' | 'case_study';
    timeSlotStart?: Date;
    timeSlotEnd?: Date;
    aiScore?: number;
    aiFeedbackSummary?: string;
    plagiarismFlagged?: boolean;
    integrityFlags?: Record<string, any>;
}

export interface InterviewWithDetails extends Interview {
    application: Application & {
        job: JobPost & {
            organization: Organization;
        };
        organization: Organization;
        candidate: User;
        recruiter: User;
    };
    creator: User;
    codingQuestions?: InterviewQuestion[]; // Changed from CodingInterviewQuestion
}

export class InterviewService {
    constructor(private prisma: PrismaClient) { }

    async createInterview(data: CreateInterviewData): Promise<Interview> {
        try {
            logger.info('Creating interview', { applicationId: data.applicationId, interviewType: data.interviewType });

            const interview = await this.prisma.interview.create({
                data: {
                    applicationId: BigInt(data.applicationId),
                    scheduledAt: data.scheduledAt,
                    mode: data.mode,
                    durationMinutes: data.durationMinutes,
                    timezone: data.timezone,
                    interviewType: data.interviewType,
                    timeSlotStart: data.timeSlotStart,
                    timeSlotEnd: data.timeSlotEnd,
                    status: 'pending',
                    createdBy: BigInt(data.createdBy),
                },
            });

            // Automatically assign 2 random DSA questions (1 medium, 1 easy)
            if (data.interviewType === 'coding') {
                try {
                    await this.assignRandomQuestionsToInterview(Number(interview.id));
                } catch (error) {
                    logger.error('Failed to assign questions to interview', {
                        interviewId: interview.id,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });

                    // Don't fail the interview creation, just log the error
                    // The questions can be assigned later manually
                }
            }

            logger.info('Interview created successfully', { interviewId: interview.id });
            return interview;
        } catch (error) {
            logger.error('Error creating interview', { error, data });
            throw error;
        }
    }

    async getInterviewById(id: number, userId: number): Promise<InterviewWithDetails> {
        try {
            const interview = await this.prisma.interview.findFirst({
                where: {
                    id: BigInt(id),
                    OR: [
                        {
                            application: {
                                candidateId: BigInt(userId), // Candidate who applied
                            },
                        },
                        {
                            createdBy: BigInt(userId), // Recruiter who created
                        },
                    ],
                },
                include: {
                    application: {
                        include: {
                            job: {
                                include: {
                                    organization: true,
                                },
                            },
                            organization: true,
                            candidate: true,
                            recruiter: true,
                        },
                    },
                    creator: true,
                    codingQuestions: { // Changed from codingQuestions
                        orderBy: {
                            orderIndex: 'asc',
                        },
                    },
                },
            });

            if (!interview) {
                throw new Error('Interview not found or access denied');
            }

            return interview;
        } catch (error) {
            logger.error('Error fetching interview:', error);
            throw error;
        }
    }

    async getInterviewsByRecruiter(recruiterId: number, filters?: {
        status?: string;
        mode?: string;
        applicationId?: number;
        interviewType?: string;
    }): Promise<InterviewWithDetails[]> {
        try {
            const where: any = {
                createdBy: recruiterId,
            };

            if (filters?.status) {
                where.status = filters.status;
            }

            if (filters?.mode) {
                where.mode = filters.mode;
            }

            if (filters?.applicationId) {
                where.applicationId = filters.applicationId;
            }

            if (filters?.interviewType) {
                where.interviewType = filters.interviewType;
            }

            const interviews = await this.prisma.interview.findMany({
                where,
                include: {
                    application: {
                        include: {
                            job: {
                                include: {
                                    organization: true,
                                },
                            },
                            organization: true,
                            candidate: true,
                            recruiter: true,
                        },
                    },
                    creator: true,
                    codingQuestions: { // Changed from codingQuestions
                        orderBy: {
                            orderIndex: 'asc',
                        },
                    },
                },
                orderBy: {
                    scheduledAt: 'desc',
                },
            });

            return interviews;
        } catch (error) {
            logger.error('Error fetching recruiter interviews:', error);
            throw error;
        }
    }

    async getInterviewsByCandidate(candidateId: number, filters?: {
        status?: string;
        mode?: string;
        interviewType?: string;
    }): Promise<InterviewWithDetails[]> {
        try {
            const where: any = {
                application: {
                    candidateId,
                },
            };

            if (filters?.status) {
                where.status = filters.status;
            }

            if (filters?.mode) {
                where.mode = filters.mode;
            }

            if (filters?.interviewType) {
                where.interviewType = filters.interviewType;
            }

            const interviews = await this.prisma.interview.findMany({
                where,
                include: {
                    application: {
                        include: {
                            job: {
                                include: {
                                    organization: true,
                                },
                            },
                            organization: true,
                            candidate: true,
                            recruiter: true,
                        },
                    },
                    creator: true,
                    codingQuestions: { // Changed from codingQuestions
                        orderBy: {
                            orderIndex: 'asc',
                        },
                    },
                },
                orderBy: {
                    scheduledAt: 'desc',
                },
            });

            return interviews;
        } catch (error) {
            logger.error('Error fetching candidate interviews:', error);
            throw error;
        }
    }

    async updateInterview(id: number, data: UpdateInterviewData, userId: number): Promise<Interview> {
        try {
            // Verify interview belongs to user
            const existingInterview = await this.prisma.interview.findFirst({
                where: {
                    id: BigInt(id),
                    OR: [
                        { createdBy: BigInt(userId) },
                        { application: { candidateId: BigInt(userId) } },
                    ],
                },
            });

            if (!existingInterview) {
                throw new Error('Interview not found or access denied');
            }

            const updatedInterview = await this.prisma.interview.update({
                where: { id: BigInt(id) },
                data: {
                    ...data,
                    updatedAt: getCurrentUTC(),
                },
            });

            logger.info('Interview updated successfully', { interviewId: id });
            return updatedInterview;
        } catch (error) {
            logger.error('Error updating interview', { error, id, data });
            throw error;
        }
    }

    async startInterview(id: number, candidateId: number): Promise<Interview> {
        try {
            // Verify interview belongs to candidate
            const interview = await this.prisma.interview.findFirst({
                where: {
                    id: BigInt(id),
                    application: {
                        candidateId: BigInt(candidateId),
                    },
                },
            });

            if (!interview) {
                throw new Error('Interview not found or access denied');
            }

            // Validate time slot
            const validation = this.validateInterviewStartTime(interview);
            if (!validation.canStart) {
                throw new Error(validation.message);
            }

            // Check if interview is already started
            if (interview.startedAt) {
                throw new Error('Interview has already been started');
            }

            const updatedInterview = await this.prisma.interview.update({
                where: { id: BigInt(id) },
                data: {
                    startedAt: getCurrentUTC(),
                    status: 'in_progress',
                    updatedAt: getCurrentUTC(),
                },
            });

            logger.info('Interview started successfully', { interviewId: id, candidateId });
            return updatedInterview;
        } catch (error) {
            logger.error('Error starting interview', { error, id, candidateId });
            throw error;
        }
    }

    async endInterview(id: number, data: {
        aiScore?: number;
        aiFeedbackSummary?: string;
        plagiarismFlagged?: boolean;
        integrityFlags?: Record<string, any>;
    }, userId: number): Promise<Interview> {
        try {
            // Verify interview belongs to user
            const existingInterview = await this.prisma.interview.findFirst({
                where: {
                    id: BigInt(id),
                    OR: [
                        { createdBy: BigInt(userId) },
                        { application: { candidateId: BigInt(userId) } },
                    ],
                },
            });

            if (!existingInterview) {
                throw new Error('Interview not found or access denied');
            }

            const updatedInterview = await this.prisma.interview.update({
                where: { id: BigInt(id) },
                data: {
                    endedAt: getCurrentUTC(),
                    status: 'completed',
                    aiScore: data.aiScore,
                    aiFeedbackSummary: data.aiFeedbackSummary,
                    plagiarismFlagged: data.plagiarismFlagged,
                    integrityFlags: data.integrityFlags,
                    updatedAt: getCurrentUTC(),
                },
            });

            logger.info('Interview ended successfully', { interviewId: id });
            return updatedInterview;
        } catch (error) {
            logger.error('Error ending interview', { error, id, data });
            throw error;
        }
    }

    async cancelInterview(id: number, userId: number): Promise<Interview> {
        try {
            // Verify interview belongs to user
            const existingInterview = await this.prisma.interview.findFirst({
                where: {
                    id: BigInt(id),
                    OR: [
                        { createdBy: BigInt(userId) },
                        { application: { candidateId: BigInt(userId) } },
                    ],
                },
            });

            if (!existingInterview) {
                throw new Error('Interview not found or access denied');
            }

            const updatedInterview = await this.prisma.interview.update({
                where: { id: BigInt(id) },
                data: {
                    status: 'cancelled',
                    updatedAt: getCurrentUTC(),
                },
            });

            logger.info('Interview cancelled successfully', { interviewId: id });
            return updatedInterview;
        } catch (error) {
            logger.error('Error cancelling interview', { error, id });
            throw error;
        }
    }

    async deleteInterview(id: number, userId: number): Promise<void> {
        try {
            // Verify interview belongs to user
            const existingInterview = await this.prisma.interview.findFirst({
                where: {
                    id: BigInt(id),
                    createdBy: BigInt(userId),
                },
            });

            if (!existingInterview) {
                throw new Error('Interview not found or access denied');
            }

            await this.prisma.interview.delete({
                where: { id: BigInt(id) },
            });

            logger.info('Interview deleted successfully', { interviewId: id });
        } catch (error) {
            logger.error('Error deleting interview', { error, id });
            throw error;
        }
    }

    async getInterviewStats(recruiterId: number): Promise<{
        total: number;
        pending: number;
        scheduled: number;
        inProgress: number;
        completed: number;
        cancelled: number;
        expired: number;
    }> {
        try {
            const stats = await this.prisma.interview.groupBy({
                by: ['status'],
                where: {
                    createdBy: BigInt(recruiterId),
                },
                _count: {
                    status: true,
                },
            });

            const result = {
                total: 0,
                pending: 0,
                scheduled: 0,
                inProgress: 0,
                completed: 0,
                cancelled: 0,
                expired: 0,
            };

            stats.forEach((stat) => {
                const count = stat._count.status;
                result.total += count;
                result[stat.status as keyof typeof result] = count;
            });

            return result;
        } catch (error) {
            logger.error('Error getting interview stats', { error, recruiterId });
            throw error;
        }
    }

    // Interview start time validation
    validateInterviewStartTime(interview: Interview): IInterviewStartValidation {
        const now = getCurrentUTC();
        const timeSlotStart = new Date(interview.timeSlotStart);
        const timeSlotEnd = new Date(interview.timeSlotEnd);

        if (now < timeSlotStart) {
            return {
                canStart: false,
                message: `Interview cannot be started early. Please start the interview at ${timeSlotStart.toLocaleString()}`,
                reason: 'future',
                timeSlotStart,
                timeSlotEnd,
                currentTime: now,
            };
        }

        if (now > timeSlotEnd) {
            return {
                canStart: false,
                message: 'Interview time slot has expired. Please contact the recruiter to reschedule.',
                reason: 'expired',
                timeSlotStart,
                timeSlotEnd,
                currentTime: now,
            };
        }

        return {
            canStart: true,
            message: 'Interview can be started',
            reason: 'valid',
            timeSlotStart,
            timeSlotEnd,
            currentTime: now,
        };
    }

    // Coding Interview Methods
    async createCodingQuestion(data: ICreateCodingQuestionInput): Promise<CodingInterviewQuestion> {
        try {
            logger.info('Creating coding question', { interviewId: data.interviewId });

            const question = await this.prisma.codingInterviewQuestion.create({
                data: {
                    interviewId: BigInt(data.interviewId),
                    questionTitle: data.questionTitle,
                    questionText: data.questionText,
                    questionExamples: data.questionExamples,
                    constraints: data.constraints,
                    difficulty: data.difficulty,
                    topic: data.topic,
                    timeLimit: data.timeLimit,
                    orderIndex: data.orderIndex || 0,
                },
            });

            logger.info('Coding question created successfully', { questionId: question.id });
            return question;
        } catch (error) {
            logger.error('Error creating coding question', { error, data });
            throw error;
        }
    }

    async getCodingQuestions(interviewId: number): Promise<CodingInterviewQuestion[]> {
        try {
            const questions = await this.prisma.codingInterviewQuestion.findMany({
                where: {
                    interviewId: BigInt(interviewId),
                },
                orderBy: {
                    orderIndex: 'asc',
                },
            });

            return questions;
        } catch (error) {
            logger.error('Error fetching coding questions', { error, interviewId });
            throw error;
        }
    }

    async runCode(data: {
        dsaQuestionId: number;
        userId: number;
        userCode: string;
        language: string;
    }): Promise<{
        executionTime: number;
        memoryUsed: number;
        testCasesPassed: number;
        totalTestCases: number;
        score: number;
        feedback: string;
        output?: string;
        error?: string;
        testCaseResults?: Array<{
            testCaseNumber: number;
            input: string;
            expectedOutput: string;
            actualOutput: string;
            status: string;
            statusDescription: string;
            passed: boolean;
            executionTime?: number;
            memoryUsed?: number;
        }>;
    }> {
        try {
            logger.info('Running code for testing', {
                dsaQuestionId: data.dsaQuestionId,
                userId: data.userId,
                language: data.language,
            });

            // Get the DSA question to get test cases
            const dsaQuestion = await this.prisma.dsaQuestion.findUnique({
                where: { id: data.dsaQuestionId },
            });

            if (!dsaQuestion) {
                throw new Error('DSA question not found');
            }

            // Evaluate code using Judge0 API (without saving to database)
            const evaluationResult = await this.evaluateCodeWithJudge0(
                data.userCode,
                data.language,
                dsaQuestion
            );

            console.log('3three', evaluationResult);

            logger.info('Code executed successfully', {
                dsaQuestionId: data.dsaQuestionId,
                score: evaluationResult.score
            });

            return evaluationResult;
        } catch (error) {
            logger.error('Error running code', { error, data });
            throw error;
        }
    }

    async submitCode(data: ICreateCodeSubmissionInput): Promise<UserCodeSubmission> {
        try {
            logger.info('Submitting code for evaluation', {
                dsaQuestionId: data.dsaQuestionId,
                userId: data.userId,
                language: data.language,
            });

            // Get the DSA question to get test cases
            const dsaQuestion = await this.prisma.dsaQuestion.findUnique({
                where: { id: data.dsaQuestionId },
            });

            if (!dsaQuestion) {
                throw new Error('DSA question not found');
            }

            // Check if there's an existing submission for this question and user
            const existingSubmission = await this.prisma.userCodeSubmission.findFirst({
                where: {
                    dsaQuestionId: BigInt(data.dsaQuestionId),
                    userId: BigInt(data.userId),
                    interviewId: data.interviewId ? BigInt(data.interviewId) : null,
                },
                orderBy: {
                    attemptNumber: 'desc',
                },
            });

            // Decode base64 user code for storage
            let decodedUserCode: string;
            try {
                if (this.isBase64(data.userCode)) {
                    decodedUserCode = Buffer.from(data.userCode, 'base64').toString('utf-8');
                    logger.info('Code decoded from base64 for storage');
                } else {
                    decodedUserCode = data.userCode;
                    logger.info('Code is not base64 encoded, using as-is for storage');
                }
            } catch (error) {
                logger.warn('Failed to decode base64 for storage, using original code', { error });
                decodedUserCode = data.userCode;
            }

            // Evaluate code using Judge0 API
            const evaluationResult = await this.evaluateCodeWithJudge0(
                data.userCode,
                data.language,
                dsaQuestion
            );

            let submission: UserCodeSubmission;

            if (existingSubmission) {
                // Update existing submission
                submission = await this.prisma.userCodeSubmission.update({
                    where: { id: existingSubmission.id },
                    data: {
                        userCode: data.userCode,
                        language: data.language,
                        isSubmitted: true,
                        submittedAt: getCurrentUTC(),
                        executionTime: evaluationResult.executionTime,
                        memoryUsed: evaluationResult.memoryUsed,
                        testCasesPassed: evaluationResult.testCasesPassed,
                        totalTestCases: evaluationResult.totalTestCases,
                        score: evaluationResult.score,
                        feedback: evaluationResult.feedback,
                    },
                });
                logger.info('Existing submission updated', { submissionId: submission.id });
            } else {
                // Create new submission
                submission = await this.prisma.userCodeSubmission.create({
                    data: {
                        dsaQuestionId: data.dsaQuestionId,
                        userId: BigInt(data.userId),
                        interviewId: data.interviewId ? BigInt(data.interviewId) : null,
                        userCode: decodedUserCode,
                        language: data.language,
                        attemptNumber: data.attemptNumber || 1,
                        isSubmitted: true,
                        submittedAt: getCurrentUTC(),
                        executionTime: evaluationResult.executionTime,
                        memoryUsed: evaluationResult.memoryUsed,
                        testCasesPassed: evaluationResult.testCasesPassed,
                        totalTestCases: evaluationResult.totalTestCases,
                        score: evaluationResult.score,
                        feedback: evaluationResult.feedback,
                    },
                });
                logger.info('New submission created', { submissionId: submission.id });
            }

            return submission;
        } catch (error) {
            logger.error('Error submitting code', { error, data });
            throw error;
        }
    }

    /**
     * Get user submissions for a specific question
     */
    async getUserSubmissions(questionId: number, userId: number): Promise<UserCodeSubmission[]> {
        try {
            const submissions = await this.prisma.userCodeSubmission.findMany({
                where: {
                    dsaQuestionId: BigInt(questionId),
                    userId: BigInt(userId),
                },
                orderBy: {
                    attemptNumber: 'asc',
                },
            });

            return submissions;
        } catch (error) {
            logger.error('Error fetching user submissions', { error, questionId, userId });
            throw error;
        }
    }

    /**
     * Get all submissions for an interview
     */
    async getInterviewSubmissions(interviewId: number, userId: number): Promise<UserCodeSubmission[]> {
        try {
            const submissions = await this.prisma.userCodeSubmission.findMany({
                where: {
                    interviewId: BigInt(interviewId),
                    userId: BigInt(userId),
                },
                include: {
                    dsaQuestion: true,
                },
                orderBy: {
                    createdAt: 'desc',
                },
            });

            return submissions;
        } catch (error) {
            logger.error('Error fetching interview submissions', { error, interviewId, userId });
            throw error;
        }
    }

    /**
     * Assign random questions to an interview (1 medium, 1 easy)
     */
    async assignRandomQuestionsToInterview(interviewId: number): Promise<InterviewQuestion[]> {
        try {
            // First, ensure questions are available
            await this.ensureQuestionsAvailable();

            // Check total available questions
            const totalQuestions = await this.prisma.dsaQuestion.count({
                where: {
                    isActive: true,
                },
            });

            logger.info('Total available questions for assignment', { totalQuestions, interviewId });

            if (totalQuestions < 2) {
                throw new Error(`Not enough questions available. Found ${totalQuestions} questions, need at least 2.`);
            }

            // Get all medium difficulty questions
            const mediumQuestions = await this.prisma.dsaQuestion.findMany({
                where: {
                    level: 'Medium',
                    isActive: true,
                },
            });

            // Get all easy difficulty questions
            const easyQuestions = await this.prisma.dsaQuestion.findMany({
                where: {
                    level: 'Easy',
                    isActive: true,
                },
            });

            logger.info('Available questions by difficulty', {
                mediumCount: mediumQuestions.length,
                easyCount: easyQuestions.length,
                interviewId,
            });

            // Handle different scenarios based on available questions
            let firstQuestion: any;
            let secondQuestion: any;

            if (mediumQuestions.length > 0 && easyQuestions.length > 0) {
                // Ideal case: we have both medium and easy questions
                firstQuestion = mediumQuestions[Math.floor(Math.random() * mediumQuestions.length)];
                secondQuestion = easyQuestions[Math.floor(Math.random() * easyQuestions.length)];
            } else if (mediumQuestions.length >= 2) {
                // Fallback: use two medium questions
                const shuffledMedium = mediumQuestions.sort(() => 0.5 - Math.random());
                firstQuestion = shuffledMedium[0];
                secondQuestion = shuffledMedium[1];
                logger.warn('Using two medium questions as fallback', { interviewId });
            } else if (easyQuestions.length >= 2) {
                // Fallback: use two easy questions
                const shuffledEasy = easyQuestions.sort(() => 0.5 - Math.random());
                firstQuestion = shuffledEasy[0];
                secondQuestion = shuffledEasy[1];
                logger.warn('Using two easy questions as fallback', { interviewId });
            } else {
                // Last resort: use any two available questions
                const allQuestions = await this.prisma.dsaQuestion.findMany({
                    where: {
                        isActive: true,
                    },
                });

                if (allQuestions.length < 2) {
                    throw new Error(`Not enough questions available. Found ${allQuestions.length} questions, need at least 2.`);
                }

                const shuffledQuestions = allQuestions.sort(() => 0.5 - Math.random());
                firstQuestion = shuffledQuestions[0];
                secondQuestion = shuffledQuestions[1];
                logger.warn('Using any two available questions as last resort', { interviewId });
            }

            // Create interview questions
            const interviewQuestions = await Promise.all([
                this.prisma.interviewQuestion.create({
                    data: {
                        interviewId: BigInt(interviewId),
                        dsaQuestionId: firstQuestion.id,
                        orderIndex: 0, // First question
                    },
                }),
                this.prisma.interviewQuestion.create({
                    data: {
                        interviewId: BigInt(interviewId),
                        dsaQuestionId: secondQuestion.id,
                        orderIndex: 1, // Second question
                    },
                }),
            ]);

            logger.info('Random questions assigned to interview', {
                interviewId,
                questionCount: interviewQuestions.length,
                firstQuestionId: firstQuestion.id.toString(),
                firstQuestionLevel: firstQuestion.level,
                secondQuestionId: secondQuestion.id.toString(),
                secondQuestionLevel: secondQuestion.level,
            });

            return interviewQuestions;
        } catch (error) {
            logger.error('Error assigning random questions to interview', { error, interviewId });
            throw error;
        }
    }

    /**
     * Check if questions are available and import from CSV if needed
     */
    async ensureQuestionsAvailable(): Promise<void> {
        try {
            const totalQuestions = await this.prisma.dsaQuestion.count({
                where: {
                    isActive: true,
                },
            });

            if (totalQuestions < 2) {
                logger.warn('Not enough questions in database, attempting to import from CSV', { totalQuestions });

                // Try to import questions from the CSV file
                const csvPath = './dsa_questions.csv';
                if (fs.existsSync(csvPath)) {
                    const { DsaQuestionService } = require('./dsa-question.service');
                    const dsaQuestionService = new DsaQuestionService(this.prisma);

                    try {
                        const result = await dsaQuestionService.bulkUploadFromCsv(csvPath);
                        logger.info('Questions imported from CSV', {
                            totalProcessed: result.totalProcessed,
                            successful: result.successful,
                            failed: result.failed
                        });
                    } catch (importError) {
                        logger.error('Failed to import questions from CSV', { importError });
                    }
                } else {
                    logger.error('CSV file not found for question import', { csvPath });
                }
            }
        } catch (error) {
            logger.error('Error checking question availability', { error });
        }
    }

    /**
     * Get questions for an interview based on submission status
     */
    async getInterviewQuestions(interviewId: number, userId: number): Promise<{
        questions: (InterviewQuestion & { dsaQuestion: DsaQuestion })[];
        currentQuestionIndex: number;
    }> {
        try {
            // Get all questions for the interview
            const interviewQuestions = await this.prisma.interviewQuestion.findMany({
                where: {
                    interviewId: BigInt(interviewId),
                },
                include: {
                    dsaQuestion: true,
                },
                orderBy: {
                    orderIndex: 'asc',
                },
            });

            if (interviewQuestions.length === 0) {
                throw new Error('No questions found for this interview');
            }

            // Check submission status for each question
            let currentQuestionIndex = 0;
            for (let i = 0; i < interviewQuestions.length; i++) {
                const question = interviewQuestions[i];

                // Check if user has submitted code for this question
                const submission = await this.prisma.userCodeSubmission.findFirst({
                    where: {
                        dsaQuestionId: question.dsaQuestionId,
                        userId: BigInt(userId),
                        interviewId: BigInt(interviewId),
                        isSubmitted: true,
                    },
                    orderBy: {
                        createdAt: 'desc',
                    },
                });

                // If no submission found for this question, this is the current question
                if (!submission) {
                    currentQuestionIndex = i;
                    break;
                }

                // If this is the last question and it has been submitted, set to last question
                if (i === interviewQuestions.length - 1) {
                    currentQuestionIndex = i;
                }
            }

            return {
                questions: interviewQuestions,
                currentQuestionIndex,
            };
        } catch (error) {
            logger.error('Error fetching interview questions', { error, interviewId, userId });
            throw error;
        }
    }

    /**
     * Evaluate code using Judge0 API
     */
    private async evaluateCodeWithJudge0(
        userCode: string,
        language: string,
        dsaQuestion: DsaQuestion
    ): Promise<{
        executionTime: number;
        memoryUsed: number;
        testCasesPassed: number;
        totalTestCases: number;
        score: number;
        feedback: string;
        output?: string;
        error?: string;
        testCaseResults?: Array<{
            testCaseNumber: number;
            input: string;
            expectedOutput: string;
            actualOutput: string;
            status: string;
            statusDescription: string;
            passed: boolean;
            executionTime?: number;
            memoryUsed?: number;
        }>;
    }> {
        try {
            const JUDGE0_BASE_URL = 'http://100.24.5.113:2358/';

            // Decode base64 user code
            let decodedUserCode: string;
            try {
                // Check if the code is base64 encoded
                if (this.isBase64(userCode)) {
                    decodedUserCode = Buffer.from(userCode, 'base64').toString('utf-8');
                    logger.info('Code decoded from base64 successfully');
                } else {
                    decodedUserCode = userCode;
                    logger.info('Code is not base64 encoded, using as-is');
                }
            } catch (error) {
                logger.warn('Failed to decode base64, using original code', { error });
                decodedUserCode = userCode;
            }

            // Map language to Judge0 language ID
            const languageMap: { [key: string]: number } = {
                'javascript': 63, // Node.js
                'python': 71,     // Python 3
                'java': 62,       // Java
                'cpp': 54,        // C++17
                'c': 50,          // C
            };

            const languageId = languageMap[language.toLowerCase()] || 63; // Default to JavaScript

            // Judge0 status descriptions
            const statusDescriptions: { [key: number]: string } = {
                1: 'In Queue',
                2: 'Processing',
                3: 'Accepted',
                4: 'Wrong Answer',
                5: 'Time Limit Exceeded',
                6: 'Compilation Error',
                7: 'Runtime Error (SIGSEGV)',
                8: 'Runtime Error (SIGXFSZ)',
                9: 'Runtime Error (SIGFPE)',
                10: 'Runtime Error (SIGABRT)',
                11: 'Runtime Error (NZEC)',
                12: 'Runtime Error (Other)',
                13: 'Internal Error',
                14: 'Exec Format Error'
            };

            // Prepare test cases
            const testCases = [
                { input: dsaQuestion.testCase1Input, output: dsaQuestion.testCase1Output },
                { input: dsaQuestion.testCase2Input, output: dsaQuestion.testCase2Output },
                { input: dsaQuestion.testCase3Input, output: dsaQuestion.testCase3Output },
            ];

            let totalTestCases = testCases.length;
            let passedTestCases = 0;
            let totalExecutionTime = 0;
            let totalMemoryUsed = 0;
            const feedback: string[] = [];
            const testCaseResults: Array<{
                testCaseNumber: number;
                input: string;
                expectedOutput: string;
                actualOutput: string;
                status: string;
                statusDescription: string;
                passed: boolean;
                executionTime?: number;
                memoryUsed?: number;
            }> = [];

            let lastOutput = '';
            let lastError = '';

            // Run each test case
            for (let i = 0; i < testCases.length; i++) {
                const testCase = testCases[i];
                const testCaseNumber = i + 1;

                try {
                    // Submit code to Judge0
                    const submissionResponse = await axios.post(`${JUDGE0_BASE_URL}/submissions?base64_encoded=true`, {
                        source_code: decodedUserCode,
                        language_id: languageId,
                        stdin: testCase.input,
                    });
                    logger.info('Running code for testing');
                    logger.error(submissionResponse);
                    console.log('1One', submissionResponse);
                    const token = submissionResponse.data.token;

                    // Wait for compilation and execution
                    let result;
                    let attempts = 0;
                    const maxAttempts = 15; // Increased timeout

                    while (attempts < maxAttempts) {
                        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

                        const resultResponse = await axios.get(`${JUDGE0_BASE_URL}/submissions/${token}`);
                        console.log('2Two', resultResponse.data);
                        result = resultResponse.data;

                        if (result.status.id > 2) { // Status > 2 means processing is complete
                            break;
                        }
                        attempts++;
                    }

                    if (!result) {
                        throw new Error('Code execution timeout');
                    }

                    const statusId = result.status.id;
                    const statusDescription = statusDescriptions[statusId] || 'Unknown Status';
                    const actualOutput = result.stdout?.trim() || '';
                    const expectedOutput = testCase.output.trim();
                    const errorOutput = result.stderr?.trim() || result.compile_output?.trim() || '';
                    const executionTime = result.time || 0;
                    const memoryUsed = result.memory || 0;

                    // Store the last output and error for overall result
                    if (actualOutput) lastOutput = actualOutput;
                    if (errorOutput) lastError = errorOutput;

                    let passed = false;
                    let status = 'FAILED';

                    // Check if compilation was successful
                    if (statusId === 6) { // Compilation Error
                        status = 'COMPILATION_ERROR';
                        feedback.push(`Test Case ${testCaseNumber}: Compilation Error - ${errorOutput}`);
                    }
                    // Check if execution was successful
                    else if (statusId === 3) { // Accepted
                        if (actualOutput === expectedOutput) {
                            passed = true;
                            status = 'PASSED';
                            passedTestCases++;
                            feedback.push(`Test Case ${testCaseNumber}: PASSED`);
                        } else {
                            status = 'WRONG_ANSWER';
                            feedback.push(`Test Case ${testCaseNumber}: FAILED - Expected: "${expectedOutput}", Got: "${actualOutput}"`);
                        }
                    }
                    // Other runtime errors
                    else {
                        status = 'RUNTIME_ERROR';
                        feedback.push(`Test Case ${testCaseNumber}: Runtime Error - ${errorOutput || statusDescription}`);
                    }

                    // Add test case result
                    testCaseResults.push({
                        testCaseNumber,
                        input: testCase.input,
                        expectedOutput,
                        actualOutput,
                        status,
                        statusDescription,
                        passed,
                        executionTime,
                        memoryUsed
                    });

                    // Accumulate execution metrics
                    totalExecutionTime += executionTime;
                    totalMemoryUsed += memoryUsed;

                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    feedback.push(`Test Case ${testCaseNumber}: ERROR - ${errorMessage}`);

                    testCaseResults.push({
                        testCaseNumber,
                        input: testCase.input,
                        expectedOutput: testCase.output,
                        actualOutput: '',
                        status: 'ERROR',
                        statusDescription: 'Execution Error',
                        passed: false
                    });
                }
            }

            // Calculate score (percentage of passed test cases)
            const score = totalTestCases > 0 ? (passedTestCases / totalTestCases) * 100 : 0;

            return {
                executionTime: Math.round(totalExecutionTime / totalTestCases),
                memoryUsed: Math.round(totalMemoryUsed / totalTestCases),
                testCasesPassed: passedTestCases,
                totalTestCases,
                score: Math.round(score * 100) / 100, // Round to 2 decimal places
                feedback: feedback.join('\n'),
                output: lastOutput,
                error: lastError,
                testCaseResults
            };

        } catch (error) {
            logger.error('Error evaluating code with Judge0', { error });
            throw new Error(`Code evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Check if a string is base64 encoded
     */
    private isBase64(str: string): boolean {
        try {
            // Check if the string contains only base64 characters
            const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
            if (!base64Regex.test(str)) {
                return false;
            }

            // Try to decode it
            const decoded = Buffer.from(str, 'base64').toString('utf-8');
            // If we can decode it and it contains printable characters, it's likely base64
            return decoded.length > 0 && /^[\x20-\x7E]*$/.test(decoded);
        } catch (error) {
            return false;
        }
    }
} 