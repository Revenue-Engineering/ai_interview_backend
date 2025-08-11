import { Request, Response } from 'express';
import { RecruiterCandidateService } from '../services/recruiter-candidate.service';
import logger from '../utils/logger';
import { serializeForJSON, serializeEntityResponse, serializeEntitiesResponse } from '../utils/serializer';

export class RecruiterCandidateController {
    constructor(private recruiterCandidateService: RecruiterCandidateService) { }

    /**
     * Get candidate details by email (recruiter access)
     * Only authenticated users with recruiter role can access this endpoint
     */
    async getCandidateByEmail(req: Request, res: Response): Promise<void> {
        try {
            const { email } = req.params;
            const recruiterId = (req as any).user.userId;

            if (!email) {
                res.status(400).json({
                    success: false,
                    message: 'Email parameter is required'
                });
                return;
            }

            const candidate = await this.recruiterCandidateService.getCandidateByEmail(email, recruiterId);

            res.status(200).json({
                success: true,
                data: serializeEntityResponse(candidate),
                message: 'Candidate details retrieved successfully'
            });
        } catch (error: any) {
            logger.error('Error in getCandidateByEmail controller:', error);

            if (error.message.includes('not found')) {
                res.status(404).json({
                    success: false,
                    message: error.message || 'Candidate not found'
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: error.message || 'Failed to fetch candidate details'
                });
            }
        }
    }

    /**
     * Get candidate details with applications (recruiter access)
     * Only returns applications that belong to the recruiter's organization
     */
    async getCandidateWithApplications(req: Request, res: Response): Promise<void> {
        try {
            const { candidateId } = req.params;
            const recruiterId = (req as any).user.userId;

            if (!candidateId) {
                res.status(400).json({
                    success: false,
                    message: 'Candidate ID parameter is required'
                });
                return;
            }

            const candidateIdNum = parseInt(candidateId);
            if (isNaN(candidateIdNum)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid candidate ID format'
                });
                return;
            }

            const candidate = await this.recruiterCandidateService.getCandidateWithApplications(candidateIdNum, recruiterId);

            res.status(200).json({
                success: true,
                data: serializeEntityResponse(candidate),
                message: 'Candidate with applications retrieved successfully',
                count: candidate.applications.length
            });
        } catch (error: any) {
            logger.error('Error in getCandidateWithApplications controller:', error);

            if (error.message.includes('not found')) {
                res.status(404).json({
                    success: false,
                    message: error.message || 'Candidate not found'
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: error.message || 'Failed to fetch candidate with applications'
                });
            }
        }
    }

    /**
     * Get candidate details with applications by email (recruiter access)
     * Only returns applications that belong to the recruiter's organization
     */
    async getCandidateWithApplicationsByEmail(req: Request, res: Response): Promise<void> {
        try {
            const { email } = req.params;
            const recruiterId = (req as any).user.userId;

            if (!email) {
                res.status(400).json({
                    success: false,
                    message: 'Email parameter is required'
                });
                return;
            }

            const candidate = await this.recruiterCandidateService.getCandidateWithApplicationsByEmail(email, recruiterId);

            res.status(200).json({
                success: true,
                data: serializeEntityResponse(candidate),
                message: 'Candidate with applications retrieved successfully',
                count: candidate.applications.length
            });
        } catch (error: any) {
            logger.error('Error in getCandidateWithApplicationsByEmail controller:', error);

            if (error.message.includes('not found')) {
                res.status(404).json({
                    success: false,
                    message: error.message || 'Candidate not found'
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: error.message || 'Failed to fetch candidate with applications'
                });
            }
        }
    }

    /**
     * Bulk assign candidates to interviews with intelligent scheduling
     * Updated endpoint with new required inputs and scheduling logic
     */
    async bulkAssignCandidates(req: Request, res: Response): Promise<void> {
        try {
            const {
                jobId,
                csv,
                numberOfDays,
                startTime,
                endTime,
                interviewType,
                durationMinutes,
                notes
            } = req.body;

            const recruiterId = (req as any).user.userId;

            // Validate required fields
            if (!jobId || !csv || !numberOfDays || !startTime || !endTime || !interviewType || !durationMinutes) {
                res.status(400).json({
                    success: false,
                    message: 'Missing required fields: jobId, csv, numberOfDays, startTime, endTime, interviewType, durationMinutes'
                });
                return;
            }

            // Validate data types
            if (typeof jobId !== 'number' || typeof numberOfDays !== 'number' || typeof durationMinutes !== 'number') {
                res.status(400).json({
                    success: false,
                    message: 'Invalid data types: jobId, numberOfDays, and durationMinutes must be numbers'
                });
                return;
            }

            if (!Array.isArray(csv) || csv.length === 0) {
                res.status(400).json({
                    success: false,
                    message: 'CSV must be a non-empty array of candidate data'
                });
                return;
            }

            // Validate time format (HH:mm)
            const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
            if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid time format. Use HH:mm format (e.g., 10:00, 16:00)'
                });
                return;
            }

            // Validate interview type
            const validInterviewTypes = ['coding', 'technical', 'behavioral', 'system_design', 'case_study'];
            if (!validInterviewTypes.includes(interviewType)) {
                res.status(400).json({
                    success: false,
                    message: `Invalid interview type. Must be one of: ${validInterviewTypes.join(', ')}`
                });
                return;
            }

            // Validate business logic
            if (numberOfDays <= 0 || numberOfDays > 365) {
                res.status(400).json({
                    success: false,
                    message: 'Number of days must be between 1 and 365'
                });
                return;
            }

            if (durationMinutes <= 0 || durationMinutes > 480) { // Max 8 hours
                res.status(400).json({
                    success: false,
                    message: 'Duration must be between 1 and 480 minutes'
                });
                return;
            }

            logger.info('Starting bulk candidate assignment', {
                jobId,
                candidateCount: csv.length,
                numberOfDays,
                startTime,
                endTime,
                interviewType,
                durationMinutes,
                recruiterId
            });

            const result = await this.recruiterCandidateService.bulkAssignCandidates(
                {
                    jobId,
                    csv,
                    numberOfDays,
                    startTime,
                    endTime,
                    interviewType,
                    durationMinutes,
                    notes
                },
                recruiterId
            );

            res.status(200).json({
                success: true,
                data: serializeForJSON(result),
                message: `Bulk assignment completed. ${result.successful} successful, ${result.failed} failed.`
            });

        } catch (error: any) {
            logger.error('Error in bulkAssignCandidates controller:', error);

            if (error.message.includes('not found') || error.message.includes('not accessible')) {
                res.status(404).json({
                    success: false,
                    message: error.message || 'Resource not found or not accessible'
                });
            } else if (error.message.includes('permission') || error.message.includes('access')) {
                res.status(403).json({
                    success: false,
                    message: error.message || 'Access denied'
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: error.message || 'Failed to process bulk assignment'
                });
            }
        }
    }

    async getCandidateApplicationById(req: Request, res: Response): Promise<void> {
        try {
            const { applicationId } = req.params;
            const recruiterId = (req as any).user.userId;

            const application = await this.recruiterCandidateService.getCandidateApplicationById(applicationId, recruiterId);

            res.status(200).json({
                success: true,
                data: serializeEntityResponse(application),
                message: 'Candidate application retrieved successfully'
            });
        } catch (error: any) {
            logger.error('Error in getCandidateApplicationById controller:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to fetch candidate application'
            });
        }
    }
}
