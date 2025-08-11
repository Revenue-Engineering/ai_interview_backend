// Base service class using Repository pattern
// Following SOLID principles with dependency injection and separation of concerns

import { PrismaClient } from '@prisma/client';
import { PaginationParams, PaginatedResponse } from '@/types';
import logger from '@/utils/logger';

// SRP: Base service handles common CRUD operations
export abstract class BaseService<T, CreateDto, UpdateDto> {
    protected prisma: PrismaClient;
    protected modelName: string;

    constructor(prisma: PrismaClient, modelName: string) {
        // DIP: Dependency injection through constructor
        this.prisma = prisma;
        this.modelName = modelName;
    }

    /**
     * Create a new entity
     * SRP: Single responsibility for entity creation
     */
    public async create(data: CreateDto): Promise<T> {
        try {
            console.log('Creating new entity', { data });
            logger.info(`Creating new ${this.modelName}`, { data });

            // Factory Pattern: Dynamic model creation based on modelName
            const result = await (this.prisma as any)[this.modelName].create({
                data,
            });

            logger.info(`${this.modelName} created successfully`, { id: result.id });
            return result;
        } catch (error) {
            logger.error(`Error creating ${this.modelName}`, { error, data });
            throw error;
        }
    }

    /**
     * Find entity by ID
     * SRP: Single responsibility for entity retrieval
     */
    public async findById(id: string, include?: any): Promise<T | null> {
        try {
            logger.debug(`Finding ${this.modelName} by ID`, { id });

            const result = await (this.prisma as any)[this.modelName].findUnique({
                where: { id },
                include,
            });

            return result;
        } catch (error) {
            logger.error(`Error finding ${this.modelName} by ID`, { error, id });
            throw error;
        }
    }

    /**
     * Find all entities with pagination
     * Performance: Pagination prevents memory issues with large datasets
     */
    public async findAll(
        params: PaginationParams = {},
        where: any = {},
        include?: any
    ): Promise<PaginatedResponse<T>> {
        try {
            const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = params;
            const skip = (page - 1) * limit;

            logger.debug(`Finding ${this.modelName}s with pagination`, { page, limit, sortBy, sortOrder });

            // Performance: Parallel execution for count and data
            const [data, total] = await Promise.all([
                (this.prisma as any)[this.modelName].findMany({
                    where,
                    include,
                    skip,
                    take: limit,
                    orderBy: { [sortBy]: sortOrder },
                }),
                (this.prisma as any)[this.modelName].count({ where }),
            ]);

            const totalPages = Math.ceil(total / limit);

            return {
                data,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1,
                },
            };
        } catch (error) {
            logger.error(`Error finding ${this.modelName}s`, { error, params });
            throw error;
        }
    }

    /**
     * Update entity by ID
     * SRP: Single responsibility for entity updates
     */
    public async update(id: string, data: UpdateDto): Promise<T> {
        try {
            logger.info(`Updating ${this.modelName}`, { id, data });

            const result = await (this.prisma as any)[this.modelName].update({
                where: { id },
                data,
            });

            logger.info(`${this.modelName} updated successfully`, { id });
            return result;
        } catch (error) {
            logger.error(`Error updating ${this.modelName}`, { error, id, data });
            throw error;
        }
    }

    /**
     * Delete entity by ID
     * SRP: Single responsibility for entity deletion
     */
    public async delete(id: string): Promise<T> {
        try {
            logger.info(`Deleting ${this.modelName}`, { id });

            const result = await (this.prisma as any)[this.modelName].delete({
                where: { id },
            });

            logger.info(`${this.modelName} deleted successfully`, { id });
            return result;
        } catch (error) {
            logger.error(`Error deleting ${this.modelName}`, { error, id });
            throw error;
        }
    }

    /**
     * Check if entity exists
     * SRP: Single responsibility for existence checking
     */
    public async exists(id: string): Promise<boolean> {
        try {
            const count = await (this.prisma as any)[this.modelName].count({
                where: { id },
            });
            return count > 0;
        } catch (error) {
            logger.error(`Error checking ${this.modelName} existence`, { error, id });
            throw error;
        }
    }

    /**
     * Find entities by custom criteria
     * SRP: Single responsibility for custom queries
     */
    public async findByCriteria(
        criteria: any,
        include?: any,
        orderBy?: any
    ): Promise<T[]> {
        try {
            logger.debug(`Finding ${this.modelName}s by criteria`, { criteria });

            return await (this.prisma as any)[this.modelName].findMany({
                where: criteria,
                include,
                orderBy,
            });
        } catch (error) {
            logger.error(`Error finding ${this.modelName}s by criteria`, { error, criteria });
            throw error;
        }
    }

    /**
     * Find single entity by custom criteria
     * SRP: Single responsibility for single entity queries
     */
    public async findOneByCriteria(
        criteria: any,
        include?: any
    ): Promise<T | null> {
        try {
            logger.debug(`Finding ${this.modelName} by criteria`, { criteria });

            return await (this.prisma as any)[this.modelName].findFirst({
                where: criteria,
                include,
            });
        } catch (error) {
            logger.error(`Error finding ${this.modelName} by criteria`, { error, criteria });
            throw error;
        }
    }

    /**
     * Count entities by criteria
     * SRP: Single responsibility for counting
     */
    public async count(criteria: any = {}): Promise<number> {
        try {
            return await (this.prisma as any)[this.modelName].count({
                where: criteria,
            });
        } catch (error) {
            logger.error(`Error counting ${this.modelName}s`, { error, criteria });
            throw error;
        }
    }

    /**
     * Bulk create entities
     * Performance: Batching reduces database round trips
     */
    public async bulkCreate(data: CreateDto[]): Promise<T[]> {
        try {
            logger.info(`Bulk creating ${data.length} ${this.modelName}s`);

            const result = await (this.prisma as any)[this.modelName].createMany({
                data,
            });

            logger.info(`Bulk created ${result.count} ${this.modelName}s`);
            return result;
        } catch (error) {
            logger.error(`Error bulk creating ${this.modelName}s`, { error, count: data.length });
            throw error;
        }
    }

    /**
     * Bulk update entities
     * Performance: Batching reduces database round trips
     */
    public async bulkUpdate(criteria: any, data: UpdateDto): Promise<{ count: number }> {
        try {
            logger.info(`Bulk updating ${this.modelName}s`, { criteria, data });

            const result = await (this.prisma as any)[this.modelName].updateMany({
                where: criteria,
                data,
            });

            logger.info(`Bulk updated ${result.count} ${this.modelName}s`);
            return result;
        } catch (error) {
            logger.error(`Error bulk updating ${this.modelName}s`, { error, criteria, data });
            throw error;
        }
    }
} 