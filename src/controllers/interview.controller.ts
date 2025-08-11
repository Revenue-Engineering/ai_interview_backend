import { Request, Response } from 'express';
import { InterviewService, CreateInterviewData, UpdateInterviewData } from '../services/interview.service';
import logger from '../utils/logger';
import { serializeForJSON, serializeEntityResponse, serializeEntitiesResponse } from '../utils/serializer';

export class InterviewController {
    constructor(private interviewService: InterviewService) { }

    async createInterview(req: Request, res: Response): Promise<void> {
        try {
            const data: CreateInterviewData = {
                ...req.body,
                createdBy: (req as any).user.userId,
            };

            const interview = await this.interviewService.createInterview(data);
            res.status(201).json({
                success: true,
                message: 'Interview created successfully',
                data: serializeEntityResponse(interview),
            });
        } catch (error) {
            logger.error('Error creating interview:', error);
            res.status(400).json({
                success: false,
                error: 'Failed to create interview',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    async getInterviewById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const userId = (req as any).user.userId;

            // Validate id parameter
            const parsedId = parseInt(id);
            if (isNaN(parsedId)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid interview ID',
                    message: 'Interview ID must be a valid number',
                });
            }

            const interview = await this.interviewService.getInterviewById(parsedId, userId);
            res.status(200).json({
                success: true,
                data: serializeEntityResponse(interview),
            });
        } catch (error) {
            logger.error('Error fetching interview:', error);
            res.status(404).json({
                success: false,
                error: 'Interview not found',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    async getRecruiterInterviews(req: Request, res: Response): Promise<void> {
        try {
            const recruiterId = (req as any).user.userId;
            const filters = {
                status: req.query.status as string,
                mode: req.query.mode as string,
                applicationId: req.query.applicationId ? parseInt(req.query.applicationId as string) : undefined,
                interviewType: req.query.interviewType as string,
            };

            const interviews = await this.interviewService.getInterviewsByRecruiter(recruiterId, filters);
            res.status(200).json({
                success: true,
                data: serializeEntitiesResponse(interviews),
                count: interviews.length,
            });
        } catch (error) {
            logger.error('Error fetching recruiter interviews:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch interviews',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    async getCandidateInterviews(req: Request, res: Response): Promise<void> {
        try {
            const candidateId = (req as any).user.userId;
            const filters = {
                status: req.query.status as string,
                mode: req.query.mode as string,
                interviewType: req.query.interviewType as string,
            };

            const interviews = await this.interviewService.getInterviewsByCandidate(candidateId, filters);
            res.status(200).json({
                success: true,
                data: serializeEntitiesResponse(interviews),
                count: interviews.length,
            });
        } catch (error) {
            logger.error('Error fetching candidate interviews:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch interviews',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    async updateInterview(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const userId = (req as any).user.userId;
            const updateData: UpdateInterviewData = req.body;

            // Validate id parameter
            const parsedId = parseInt(id);
            if (isNaN(parsedId)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid interview ID',
                    message: 'Interview ID must be a valid number',
                });
            }

            const interview = await this.interviewService.updateInterview(parsedId, updateData, userId);
            res.status(200).json({
                success: true,
                message: 'Interview updated successfully',
                data: serializeEntityResponse(interview),
            });
        } catch (error) {
            logger.error('Error updating interview:', error);
            res.status(400).json({
                success: false,
                error: 'Failed to update interview',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    async startInterview(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const candidateId = (req as any).user.userId;

            // Validate id parameter
            const parsedId = parseInt(id);
            if (isNaN(parsedId)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid interview ID',
                    message: 'Interview ID must be a valid number',
                });
            }

            const interview = await this.interviewService.startInterview(parsedId, candidateId);
            res.status(200).json({
                success: true,
                message: 'Interview started successfully',
                data: serializeEntityResponse(interview),
            });
        } catch (error) {
            logger.error('Error starting interview:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            // Check if it's a time validation error
            if (errorMessage.includes('cannot be started early') || errorMessage.includes('time slot has expired')) {
                res.status(400).json({
                    success: false,
                    error: 'Time validation failed',
                    message: errorMessage,
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: 'Failed to start interview',
                    message: errorMessage,
                });
            }
        }
    }

    async endInterview(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const userId = (req as any).user.userId;
            const endData = req.body;

            // Validate id parameter
            const parsedId = parseInt(id);
            if (isNaN(parsedId)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid interview ID',
                    message: 'Interview ID must be a valid number',
                });
            }

            const interview = await this.interviewService.endInterview(parsedId, endData, userId);
            res.status(200).json({
                success: true,
                message: 'Interview ended successfully',
                data: serializeEntityResponse(interview),
            });
        } catch (error) {
            logger.error('Error ending interview:', error);
            res.status(400).json({
                success: false,
                error: 'Failed to end interview',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    async cancelInterview(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const userId = (req as any).user.userId;

            // Validate id parameter
            const parsedId = parseInt(id);
            if (isNaN(parsedId)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid interview ID',
                    message: 'Interview ID must be a valid number',
                });
            }

            const interview = await this.interviewService.cancelInterview(parsedId, userId);
            res.status(200).json({
                success: true,
                message: 'Interview cancelled successfully',
                data: serializeEntityResponse(interview),
            });
        } catch (error) {
            logger.error('Error cancelling interview:', error);
            res.status(400).json({
                success: false,
                error: 'Failed to cancel interview',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    async deleteInterview(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const userId = (req as any).user.userId;

            // Validate id parameter
            const parsedId = parseInt(id);
            if (isNaN(parsedId)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid interview ID',
                    message: 'Interview ID must be a valid number',
                });
            }

            await this.interviewService.deleteInterview(parsedId, userId);
            res.status(200).json({
                success: true,
                message: 'Interview deleted successfully',
            });
        } catch (error) {
            logger.error('Error deleting interview:', error);
            res.status(400).json({
                success: false,
                error: 'Failed to delete interview',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    async getInterviewStats(req: Request, res: Response): Promise<void> {
        try {
            const recruiterId = (req as any).user.userId;

            const stats = await this.interviewService.getInterviewStats(recruiterId);
            res.status(200).json({
                success: true,
                data: serializeForJSON(stats),
            });
        } catch (error) {
            logger.error('Error fetching interview stats:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch interview stats',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    // Coding Interview Endpoints
    async createCodingQuestion(req: Request, res: Response): Promise<void> {
        try {
            const question = await this.interviewService.createCodingQuestion(req.body);
            res.status(201).json({
                success: true,
                message: 'Coding question created successfully',
                data: serializeEntityResponse(question),
            });
        } catch (error) {
            logger.error('Error creating coding question:', error);
            res.status(400).json({
                success: false,
                error: 'Failed to create coding question',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    async getCodingQuestions(req: Request, res: Response): Promise<void> {
        try {
            const { interviewId } = req.params;
            // Validate interviewId parameter
            const parsedInterviewId = parseInt(interviewId);
            if (isNaN(parsedInterviewId)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid interview ID',
                    message: 'Interview ID must be a valid number',
                });
            }

            const questions = await this.interviewService.getCodingQuestions(parsedInterviewId);
            res.status(200).json({
                success: true,
                data: serializeEntitiesResponse(questions),
                count: questions.length,
            });
        } catch (error) {
            logger.error('Error fetching coding questions:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch coding questions',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    /**
     * Get questions for an interview based on submission status
     */
    async getInterviewQuestions(req: Request, res: Response): Promise<void> {
        try {
            const { interviewId } = req.params;
            const userId = (req as any).user.userId;

            // Validate interviewId parameter
            const parsedInterviewId = parseInt(interviewId);
            if (isNaN(parsedInterviewId)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid interview ID',
                    message: 'Interview ID must be a valid number',
                });
            }

            const result = await this.interviewService.getInterviewQuestions(parsedInterviewId, userId);

            res.status(200).json({
                success: true,
                data: {
                    questions: serializeEntitiesResponse(result.questions),
                    currentQuestionIndex: result.currentQuestionIndex,
                    totalQuestions: result.questions.length,
                },
            });
        } catch (error) {
            logger.error('Error fetching interview questions:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch interview questions',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    /**
     * Submit code for evaluation
     */
    async runCode(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user.userId;
            const runData = {
                dsaQuestionId: req.body.dsaQuestionId,
                userId,
                userCode: req.body.userCode,
                language: req.body.language,
            };

            const result = await this.interviewService.runCode(runData);
            res.status(200).json({
                success: true,
                message: 'Code executed successfully',
                data: result,
            });
        } catch (error) {
            logger.error('Error running code:', error);
            res.status(400).json({
                success: false,
                error: 'Failed to run code',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    async submitCode(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user.userId;
            const submissionData = {
                ...req.body,
                userId,
            };

            const submission = await this.interviewService.submitCode(submissionData);
            res.status(201).json({
                success: true,
                message: 'Code submitted and evaluated successfully',
                data: serializeEntityResponse(submission),
            });
        } catch (error) {
            logger.error('Error submitting code:', error);
            res.status(400).json({
                success: false,
                error: 'Failed to submit code',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    /**
     * Get user submissions for a specific question
     */
    async getUserSubmissions(req: Request, res: Response): Promise<void> {
        try {
            const { questionId } = req.params;
            const userId = (req as any).user.userId;

            // Validate questionId parameter
            const parsedQuestionId = parseInt(questionId);
            if (isNaN(parsedQuestionId)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid question ID',
                    message: 'Question ID must be a valid number',
                });
            }

            const submissions = await this.interviewService.getUserSubmissions(parsedQuestionId, userId);
            res.status(200).json({
                success: true,
                data: serializeEntitiesResponse(submissions),
                count: submissions.length,
            });
        } catch (error) {
            logger.error('Error fetching user submissions:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch user submissions',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    /**
     * Get submission history for an interview
     */
    async getInterviewSubmissions(req: Request, res: Response): Promise<void> {
        try {
            const { interviewId } = req.params;
            const userId = (req as any).user.userId;

            // Validate interviewId parameter
            const parsedInterviewId = parseInt(interviewId);
            if (isNaN(parsedInterviewId)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid interview ID',
                    message: 'Interview ID must be a valid number',
                });
            }

            const submissions = await this.interviewService.getInterviewSubmissions(parsedInterviewId, userId);
            res.status(200).json({
                success: true,
                data: serializeEntitiesResponse(submissions),
                count: submissions.length,
            });
        } catch (error) {
            logger.error('Error fetching interview submissions:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch interview submissions',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    /**
     * Manually assign questions to an interview
     */
    async assignQuestionsToInterview(req: Request, res: Response): Promise<void> {
        try {
            const { interviewId } = req.params;
            const userId = (req as any).user.userId;

            // Validate interviewId parameter
            const parsedInterviewId = parseInt(interviewId);
            if (isNaN(parsedInterviewId)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid interview ID',
                    message: 'Interview ID must be a valid number',
                });
            }

            const questions = await this.interviewService.assignRandomQuestionsToInterview(parsedInterviewId);
            res.status(200).json({
                success: true,
                message: 'Questions assigned successfully',
                data: serializeEntitiesResponse(questions),
            });
        } catch (error) {
            logger.error('Error assigning questions to interview:', error);
            res.status(400).json({
                success: false,
                error: 'Failed to assign questions',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
} 