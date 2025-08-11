import { Request, Response } from 'express';
import { DsaQuestionService } from '../services/dsa-question.service';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';
import { serializeEntityResponse, serializeEntitiesResponse, serializePaginatedResponse } from '../utils/serializer';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

export class DsaQuestionController {
    private dsaQuestionService: DsaQuestionService;

    constructor(prisma: PrismaClient) {
        this.dsaQuestionService = new DsaQuestionService(prisma);
    }

    /**
     * Create a new DSA question
     */
    async createDsaQuestion(req: Request, res: Response): Promise<void> {
        try {
            const data = { ...req.body, createdBy: (req as any).user.userId };
            const question = await this.dsaQuestionService.createDsaQuestion(data);

            res.status(201).json({
                success: true,
                message: 'DSA question created successfully',
                data: serializeEntityResponse(question)
            });
        } catch (error) {
            logger.error('Error creating DSA question', { error });
            res.status(400).json({
                success: false,
                error: 'Failed to create DSA question',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Get DSA question by ID
     */
    async getDsaQuestionById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const question = await this.dsaQuestionService.getDsaQuestionById(parseInt(id));

            res.status(200).json({
                success: true,
                data: serializeEntityResponse(question)
            });
        } catch (error) {
            logger.error('Error fetching DSA question by ID', { error });
            res.status(404).json({
                success: false,
                error: 'DSA question not found',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Get all DSA questions with filtering and pagination
     */
    async getDsaQuestions(req: Request, res: Response): Promise<void> {
        try {
            const { page, limit, sortBy, sortOrder, difficulty, topic, isActive } = req.query;

            const filters = {
                difficulty: difficulty as string,
                topic: topic as string,
                isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined
            };

            const pagination = {
                page: page ? parseInt(page as string) : 1,
                limit: limit ? parseInt(limit as string) : 10,
                sortBy: sortBy as string || 'createdAt',
                sortOrder: sortOrder as 'asc' | 'desc' || 'desc'
            };

            const result = await this.dsaQuestionService.getDsaQuestions(filters, pagination);

            res.status(200).json({
                success: true,
                data: serializePaginatedResponse(result)
            });
        } catch (error) {
            logger.error('Error fetching DSA questions', { error });
            res.status(400).json({
                success: false,
                error: 'Failed to fetch DSA questions',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Update DSA question
     */
    async updateDsaQuestion(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const question = await this.dsaQuestionService.updateDsaQuestion(parseInt(id), req.body);

            res.status(200).json({
                success: true,
                message: 'DSA question updated successfully',
                data: serializeEntityResponse(question)
            });
        } catch (error) {
            logger.error('Error updating DSA question', { error });
            res.status(400).json({
                success: false,
                error: 'Failed to update DSA question',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Delete DSA question (soft delete)
     */
    async deleteDsaQuestion(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            await this.dsaQuestionService.deleteDsaQuestion(parseInt(id));

            res.status(200).json({
                success: true,
                message: 'DSA question deleted successfully'
            });
        } catch (error) {
            logger.error('Error deleting DSA question', { error });
            res.status(400).json({
                success: false,
                error: 'Failed to delete DSA question',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Get DSA question statistics
     */
    async getDsaQuestionStats(req: Request, res: Response): Promise<void> {
        try {
            const stats = await this.dsaQuestionService.getDsaQuestionStats();

            res.status(200).json({
                success: true,
                data: stats
            });
        } catch (error) {
            logger.error('Error fetching DSA question stats', { error });
            res.status(400).json({
                success: false,
                error: 'Failed to fetch DSA question statistics',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Get random DSA questions
     */
    async getRandomQuestions(req: Request, res: Response): Promise<void> {
        try {
            const { count = '2', difficulty, topic } = req.query;
            const excludeIds = req.query.excludeIds ? (req.query.excludeIds as string).split(',').map(id => BigInt(id)) : undefined;

            const questions = await this.dsaQuestionService.getRandomQuestions(
                parseInt(count as string),
                {
                    difficulty: difficulty as string,
                    topic: topic as string,
                    excludeIds
                }
            );

            res.status(200).json({
                success: true,
                data: serializeEntitiesResponse(questions)
            });
        } catch (error) {
            logger.error('Error fetching random DSA questions', { error });
            res.status(400).json({
                success: false,
                error: 'Failed to fetch random DSA questions',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Get questions for a specific interview
     */
    async getInterviewQuestions(req: Request, res: Response): Promise<void> {
        try {
            const { interviewId } = req.params;
            const questions = await this.dsaQuestionService.getInterviewQuestions(parseInt(interviewId));

            res.status(200).json({
                success: true,
                data: serializeEntitiesResponse(questions)
            });
        } catch (error) {
            logger.error('Error fetching interview questions', { error });
            res.status(400).json({
                success: false,
                error: 'Failed to fetch interview questions',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Assign questions to an interview
     */
    async assignQuestionsToInterview(req: Request, res: Response): Promise<void> {
        try {
            const { interviewId } = req.params;
            const { questionIds, timeLimits } = req.body;

            if (!questionIds || !Array.isArray(questionIds)) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid input',
                    message: 'questionIds must be an array'
                });
                return;
            }

            const interviewQuestions = await this.dsaQuestionService.assignQuestionsToInterview(
                parseInt(interviewId),
                questionIds,
                timeLimits
            );

            res.status(200).json({
                success: true,
                message: 'Questions assigned to interview successfully',
                data: serializeEntitiesResponse(interviewQuestions)
            });
        } catch (error) {
            logger.error('Error assigning questions to interview', { error });
            res.status(400).json({
                success: false,
                error: 'Failed to assign questions to interview',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Bulk upload DSA questions from CSV
     */
    async bulkUploadFromCsv(req: Request, res: Response): Promise<void> {
        try {
            if (!req.file) {
                res.status(400).json({
                    success: false,
                    error: 'No file uploaded',
                    message: 'Please upload a CSV file'
                });
                return;
            }

            const filePath = req.file.path;
            const createdBy = (req as any).user.userId;

            const result = await this.dsaQuestionService.bulkUploadFromCsv(filePath, BigInt(createdBy));

            // Clean up uploaded file
            fs.unlinkSync(filePath);

            res.status(200).json({
                success: true,
                message: 'Bulk upload completed',
                data: result
            });
        } catch (error) {
            logger.error('Error in bulk upload', { error });

            // Clean up uploaded file if it exists
            if (req.file) {
                try {
                    fs.unlinkSync(req.file.path);
                } catch (cleanupError) {
                    logger.error('Error cleaning up uploaded file', { cleanupError });
                }
            }

            res.status(400).json({
                success: false,
                error: 'Failed to process bulk upload',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Download CSV template for bulk upload
     */
    async downloadCsvTemplate(req: Request, res: Response): Promise<void> {
        try {
            const templatePath = path.join(__dirname, '../templates/dsa-questions-template.csv');

            if (!fs.existsSync(templatePath)) {
                // Create template if it doesn't exist
                const templateContent = `title,description,examples,constraints,difficulty,topic,testCases,timeLimit,isActive
"Two Sum","Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.","[{\"input\": \"nums = [2,7,11,15], target = 9\", \"output\": \"[0,1]\", \"explanation\": \"Because nums[0] + nums[1] == 9, we return [0, 1].\"}]","You may assume that each input would have exactly one solution, and you may not use the same element twice.","easy","arrays","[{\"input\": [2,7,11,15], \"target\": 9, \"output\": [0,1]}, {\"input\": [3,2,4], \"target\": 6, \"output\": [1,2]}]",30,true
"Valid Parentheses","Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.","[{\"input\": \"s = '()'\", \"output\": \"true\"}, {\"input\": \"s = '()[]{}\"\", \"output\": \"true\"}]","An input string is valid if: 1) Open brackets must be closed by the same type of brackets. 2) Open brackets must be closed in the correct order.","easy","strings","[{\"input\": \"()\", \"output\": true}, {\"input\": \"()[]{}\", \"output\": true}, {\"input\": \"(]\", \"output\": false}]",30,true`;

                fs.writeFileSync(templatePath, templateContent);
            }

            res.download(templatePath, 'dsa-questions-template.csv', (err) => {
                if (err) {
                    logger.error('Error downloading CSV template', { error: err });
                    res.status(500).json({
                        success: false,
                        error: 'Failed to download template',
                        message: 'Error occurred while downloading template'
                    });
                }
            });
        } catch (error) {
            logger.error('Error creating CSV template', { error });
            res.status(500).json({
                success: false,
                error: 'Failed to create template',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
} 