import { PrismaClient, DsaQuestion, InterviewQuestion, Prisma } from '@prisma/client';
import { BaseService } from './base.service';
import { ICreateDsaQuestionInput, IUpdateDsaQuestionInput, IDsaQuestion, PaginationParams, PaginatedResponse } from '../types';
import logger from '../utils/logger';
import { serializeEntityResponse, serializeEntitiesResponse, serializePaginatedResponse } from '../utils/serializer';
import { getCurrentUTC } from '../utils/datetime';
import csv from 'csv-parser';
import * as fs from 'fs';

export interface DsaQuestionWithDetails extends DsaQuestion {
    creator?: {
        id: bigint;
        firstName: string;
        lastName: string;
        email: string;
    } | null;
}

export interface BulkUploadResult {
    totalProcessed: number;
    successful: number;
    failed: number;
    errors: string[];
}

export class DsaQuestionService extends BaseService<IDsaQuestion, ICreateDsaQuestionInput, IUpdateDsaQuestionInput> {
    constructor(private prisma: PrismaClient) {
        super(prisma, 'dsaQuestion');
    }

    /**
     * Create a new DSA question
     */
    async createDsaQuestion(data: ICreateDsaQuestionInput): Promise<DsaQuestionWithDetails> {
        try {
            const question = await this.prisma.dsaQuestion.create({
                data: {
                    name: data.name,
                    level: data.level,
                    problemStatement: data.problemStatement,
                    inputFormat: data.inputFormat,
                    constraints: data.constraints,
                    inputExample: data.inputExample,
                    outputFormat: data.outputFormat,
                    outputExample: data.outputExample,
                    explanation: data.explanation,
                    editorialAnswerInCpp: data.editorialAnswerInCpp,
                    testCase1Input: data.testCase1Input,
                    testCase1Output: data.testCase1Output,
                    testCase2Input: data.testCase2Input,
                    testCase2Output: data.testCase2Output,
                    testCase3Input: data.testCase3Input,
                    testCase3Output: data.testCase3Output,
                    topic: data.topic,
                    timeLimit: data.timeLimit || 30,
                    isActive: data.isActive !== false, // Default to true
                    createdBy: data.createdBy ? BigInt(data.createdBy) : null,
                },
                include: {
                    creator: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                },
            });

            logger.info('DSA question created', { questionId: question.id.toString() });
            return question;
        } catch (error) {
            logger.error('Error creating DSA question', { error, data });
            throw error;
        }
    }

    /**
     * Get DSA question by ID with details
     */
    async getDsaQuestionById(id: number): Promise<DsaQuestionWithDetails> {
        try {
            const question = await this.prisma.dsaQuestion.findFirst({
                where: {
                    id: BigInt(id),
                    isActive: true,
                },
                include: {
                    creator: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                },
            });

            if (!question) {
                throw new Error('DSA question not found');
            }

            return question;
        } catch (error) {
            logger.error('Error fetching DSA question by ID', { error, id });
            throw error;
        }
    }

    /**
     * Get all DSA questions with filtering and pagination
     */
    async getDsaQuestions(
        filters?: {
            difficulty?: string;
            topic?: string;
            isActive?: boolean;
        },
        pagination: PaginationParams = {}
    ): Promise<PaginatedResponse<DsaQuestionWithDetails>> {
        try {
            const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;

            const where: any = {};
            if (filters?.difficulty) where.difficulty = filters.difficulty;
            if (filters?.topic) where.topic = filters.topic;
            if (filters?.isActive !== undefined) where.isActive = filters.isActive;

            const [questions, total] = await Promise.all([
                this.prisma.dsaQuestion.findMany({
                    where,
                    include: {
                        creator: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                            },
                        },
                    },
                    orderBy: { [sortBy]: sortOrder },
                    skip: (page - 1) * limit,
                    take: limit,
                }),
                this.prisma.dsaQuestion.count({ where }),
            ]);

            return {
                data: questions,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                    hasNext: page * limit < total,
                    hasPrev: page > 1,
                },
            };
        } catch (error) {
            logger.error('Error fetching DSA questions', { error, filters, pagination });
            throw error;
        }
    }

    /**
     * Get random DSA questions for an interview
     */
    async getRandomQuestions(
        count: number = 2,
        filters?: {
            difficulty?: string;
            topic?: string;
            excludeIds?: bigint[];
        }
    ): Promise<DsaQuestion[]> {
        try {
            const where: any = {
                isActive: true,
            };

            if (filters?.difficulty) where.difficulty = filters.difficulty;
            if (filters?.topic) where.topic = filters.topic;
            if (filters?.excludeIds && filters.excludeIds.length > 0) {
                where.id = { notIn: filters.excludeIds };
            }

            // Get total count for random selection
            const totalCount = await this.prisma.dsaQuestion.count({ where });

            if (totalCount === 0) {
                throw new Error('No DSA questions available with the specified filters');
            }

            if (totalCount <= count) {
                // If we have fewer questions than requested, return all
                return await this.prisma.dsaQuestion.findMany({
                    where,
                    orderBy: { createdAt: 'desc' },
                });
            }

            // Get random questions using SQL RANDOM()
            const questions = await this.prisma.$queryRaw<DsaQuestion[]>`
                SELECT * FROM dsa_questions 
                WHERE is_active = true
                ${filters?.difficulty ? Prisma.sql`AND difficulty = ${filters.difficulty}` : Prisma.sql``}
                ${filters?.topic ? Prisma.sql`AND topic = ${filters.topic}` : Prisma.sql``}
                ${filters?.excludeIds && filters.excludeIds.length > 0 ? Prisma.sql`AND id NOT IN (${Prisma.join(filters.excludeIds)})` : Prisma.sql``}
                ORDER BY RANDOM()
                LIMIT ${count}
            `;

            return questions;
        } catch (error) {
            logger.error('Error getting random DSA questions', { error, count, filters });
            throw error;
        }
    }

    /**
     * Assign questions to an interview
     */
    async assignQuestionsToInterview(
        interviewId: number,
        questionIds: number[],
        timeLimits?: number[]
    ): Promise<InterviewQuestion[]> {
        try {
            const interviewQuestions = await Promise.all(
                questionIds.map(async (questionId, index) => {
                    return await this.prisma.interviewQuestion.create({
                        data: {
                            interviewId: BigInt(interviewId),
                            dsaQuestionId: BigInt(questionId),
                            orderIndex: index,
                            timeLimit: timeLimits?.[index] || null,
                        },
                    });
                })
            );

            logger.info('Questions assigned to interview', {
                interviewId,
                questionCount: interviewQuestions.length,
            });

            return interviewQuestions;
        } catch (error) {
            logger.error('Error assigning questions to interview', { error, interviewId, questionIds });
            throw error;
        }
    }

    /**
     * Get questions for a specific interview
     */
    async getInterviewQuestions(interviewId: number): Promise<(InterviewQuestion & { dsaQuestion: DsaQuestion })[]> {
        try {
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

            return interviewQuestions;
        } catch (error) {
            logger.error('Error fetching interview questions', { error, interviewId });
            throw error;
        }
    }

    /**
     * Bulk upload DSA questions from CSV
     */
    async bulkUploadFromCsv(
        filePath: string,
        createdBy?: bigint
    ): Promise<BulkUploadResult> {
        const result: BulkUploadResult = {
            totalProcessed: 0,
            successful: 0,
            failed: 0,
            errors: [],
        };

        try {
            const questions: ICreateDsaQuestionInput[] = [];

            // Parse CSV file
            await new Promise((resolve, reject) => {
                fs.createReadStream(filePath)
                    .pipe(csv())
                    .on('data', (row) => {
                        try {
                            const question = this.parseCsvRow(row);
                            questions.push({
                                ...question,
                                createdBy: createdBy,
                            });
                        } catch (error) {
                            result.failed++;
                            result.errors.push(`Row ${result.totalProcessed + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                        }
                        result.totalProcessed++;
                    })
                    .on('end', resolve)
                    .on('error', reject);
            });

            // Insert questions in batches
            const batchSize = 50;
            for (let i = 0; i < questions.length; i += batchSize) {
                const batch = questions.slice(i, i + batchSize);
                try {
                    await this.prisma.dsaQuestion.createMany({
                        data: batch.map(q => ({
                            name: q.name,
                            level: q.level,
                            problemStatement: q.problemStatement,
                            inputFormat: q.inputFormat,
                            constraints: q.constraints,
                            inputExample: q.inputExample,
                            outputFormat: q.outputFormat,
                            outputExample: q.outputExample,
                            explanation: q.explanation,
                            editorialAnswerInCpp: q.editorialAnswerInCpp,
                            testCase1Input: q.testCase1Input,
                            testCase1Output: q.testCase1Output,
                            testCase2Input: q.testCase2Input,
                            testCase2Output: q.testCase2Output,
                            testCase3Input: q.testCase3Input,
                            testCase3Output: q.testCase3Output,
                            topic: q.topic,
                            timeLimit: q.timeLimit || 30,
                            isActive: q.isActive !== false,
                            createdBy: q.createdBy || null,
                        })),
                    });
                    result.successful += batch.length;
                } catch (error) {
                    result.failed += batch.length;
                    result.errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }

            logger.info('Bulk upload completed', result);
            return result;
        } catch (error) {
            logger.error('Error in bulk upload', { error, filePath });
            throw error;
        }
    }

    /**
     * Parse CSV row into DSA question input
     */
    private parseCsvRow(row: any): ICreateDsaQuestionInput {
        const requiredFields = ['Name', 'Level', 'Problem Statement', 'Input Format', 'Constraints', 'Input Example', 'Output Format', 'Output Example', 'Explanation', 'Editorial Answer in C++', 'Test Case 1 Input', 'Test Case 1 Output', 'Test Case 2 Input', 'Test Case 2 Output', 'Test Case 3 Input', 'Test Case 3 Output'];

        for (const field of requiredFields) {
            if (!row[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        // Validate level
        if (!['Easy', 'Medium', 'Hard'].includes(row.Level)) {
            throw new Error(`Invalid level: ${row.Level}. Must be Easy, Medium, or Hard`);
        }

        return {
            name: row.Name.trim(),
            level: row.Level,
            problemStatement: row['Problem Statement'].trim(),
            inputFormat: row['Input Format'].trim(),
            constraints: row.Constraints.trim(),
            inputExample: row['Input Example'].trim(),
            outputFormat: row['Output Format'].trim(),
            outputExample: row['Output Example'].trim(),
            explanation: row.Explanation.trim(),
            editorialAnswerInCpp: row['Editorial Answer in C++'].trim(),
            testCase1Input: row['Test Case 1 Input'].trim(),
            testCase1Output: row['Test Case 1 Output'].trim(),
            testCase2Input: row['Test Case 2 Input'].trim(),
            testCase2Output: row['Test Case 2 Output'].trim(),
            testCase3Input: row['Test Case 3 Input'].trim(),
            testCase3Output: row['Test Case 3 Output'].trim(),
            topic: 'arrays', // Default topic, can be enhanced later
            timeLimit: 30, // Default time limit
            isActive: true,
        };
    }

    /**
     * Update DSA question
     */
    async updateDsaQuestion(id: number, data: IUpdateDsaQuestionInput): Promise<DsaQuestionWithDetails> {
        try {
            const question = await this.prisma.dsaQuestion.update({
                where: { id: BigInt(id) },
                data: {
                    ...data,
                    updatedAt: getCurrentUTC(),
                },
                include: {
                    creator: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                },
            });

            logger.info('DSA question updated', { questionId: question.id.toString() });
            return question;
        } catch (error) {
            logger.error('Error updating DSA question', { error, id, data });
            throw error;
        }
    }

    /**
     * Delete DSA question (soft delete by setting isActive to false)
     */
    async deleteDsaQuestion(id: number): Promise<void> {
        try {
            await this.prisma.dsaQuestion.update({
                where: { id: BigInt(id) },
                data: {
                    isActive: false,
                    updatedAt: getCurrentUTC(),
                },
            });

            logger.info('DSA question deleted', { questionId: id });
        } catch (error) {
            logger.error('Error deleting DSA question', { error, id });
            throw error;
        }
    }

    /**
     * Get DSA question statistics
     */
    async getDsaQuestionStats(): Promise<{
        total: number;
        active: number;
        byDifficulty: Record<string, number>;
        byTopic: Record<string, number>;
    }> {
        try {
            const [total, active, byDifficulty, byTopic] = await Promise.all([
                this.prisma.dsaQuestion.count(),
                this.prisma.dsaQuestion.count({ where: { isActive: true } }),
                this.prisma.dsaQuestion.groupBy({
                    by: ['difficulty'],
                    where: { isActive: true },
                    _count: { difficulty: true },
                }),
                this.prisma.dsaQuestion.groupBy({
                    by: ['topic'],
                    where: { isActive: true },
                    _count: { topic: true },
                }),
            ]);

            return {
                total,
                active,
                byDifficulty: byDifficulty.reduce((acc, item) => {
                    acc[item.difficulty] = item._count.difficulty;
                    return acc;
                }, {} as Record<string, number>),
                byTopic: byTopic.reduce((acc, item) => {
                    acc[item.topic] = item._count.topic;
                    return acc;
                }, {} as Record<string, number>),
            };
        } catch (error) {
            logger.error('Error getting DSA question stats', { error });
            throw error;
        }
    }
} 