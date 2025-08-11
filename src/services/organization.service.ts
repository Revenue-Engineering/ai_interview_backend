// Organization service using Service-Repository pattern
// Following SOLID principles with single responsibility and dependency injection

import { PrismaClient } from '@prisma/client';
import { BaseService } from './base.service';
import {
    Organization,
    CreateOrganizationDto,
    UpdateOrganizationDto,
    PaginationParams,
    PaginatedResponse
} from '@/types';
import logger from '@/utils/logger';

// SRP: Organization service handles only organization-related business logic
export class OrganizationService extends BaseService<Organization, CreateOrganizationDto, UpdateOrganizationDto> {
    constructor(prisma: PrismaClient) {
        // DIP: Dependency injection through constructor
        super(prisma, 'organization');
    }

    /**
     * Create a new organization with validation
     * SRP: Single responsibility for organization creation
     */
    public async createOrganization(data: CreateOrganizationDto): Promise<Organization> {
        try {
            logger.info('Creating new organization', { name: data.name });

            // Check if organization with same name already exists
            // const existingOrg = await this.findOneByCriteria({ name: data.name });
            // if (existingOrg) {
            //     throw new Error('Organization with this name already exists');
            // }

            // Create organization
            const organization = await this.create(data);

            logger.info('Organization created successfully', { id: organization.id, name: organization.name });
            return organization;
        } catch (error) {
            logger.error('Error creating organization', { error, data });
            throw error;
        }
    }

    /**
     * Get organization by ID with recruiters and jobs
     * SRP: Single responsibility for organization retrieval with relations
     */
    public async getOrganizationById(id: string): Promise<Organization | null> {
        try {
            logger.debug('Getting organization by ID with relations', { id });

            const organization = await this.prisma.organization.findUnique({
                where: { id },
                include: {
                    recruiters: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            title: true,
                            isActive: true,
                            createdAt: true,
                        },
                    },
                    jobs: {
                        where: { isActive: true },
                        select: {
                            id: true,
                            title: true,
                            location: true,
                            jobType: true,
                            experienceLevel: true,
                            isActive: true,
                            createdAt: true,
                        },
                    },
                },
            });

            return organization;
        } catch (error) {
            logger.error('Error getting organization by ID', { error, id });
            throw error;
        }
    }

    /**
     * Get all organizations with pagination and filtering
     * Performance: Pagination prevents memory issues with large datasets
     */
    public async getOrganizations(
        params: PaginationParams = {},
        filters: {
            name?: string;
            industry?: string;
            size?: string;
            location?: string;
        } = {}
    ): Promise<PaginatedResponse<Organization>> {
        try {
            logger.debug('Getting organizations with filters', { params, filters });

            // Build where clause for filtering
            const where: any = {};

            if (filters.name) {
                where.name = { contains: filters.name, mode: 'insensitive' };
            }

            if (filters.industry) {
                where.industry = filters.industry;
            }

            if (filters.size) {
                where.size = filters.size;
            }

            if (filters.location) {
                where.location = { contains: filters.location, mode: 'insensitive' };
            }

            return await this.findAll(params, where);
        } catch (error) {
            logger.error('Error getting organizations', { error, params, filters });
            throw error;
        }
    }

    /**
     * Update organization with validation
     * SRP: Single responsibility for organization updates
     */
    public async updateOrganization(id: string, data: UpdateOrganizationDto): Promise<Organization> {
        try {
            logger.info('Updating organization', { id, data });

            // Check if organization exists
            const existingOrg = await this.findById(id);
            if (!existingOrg) {
                throw new Error('Organization not found');
            }

            // If name is being updated, check for duplicates
            if (data.name && data.name !== existingOrg.name) {
                const duplicateOrg = await this.findOneByCriteria({
                    name: data.name,
                    id: { not: id } // Exclude current organization
                });

                if (duplicateOrg) {
                    throw new Error('Organization with this name already exists');
                }
            }

            const updatedOrg = await this.update(id, data);

            logger.info('Organization updated successfully', { id, name: updatedOrg.name });
            return updatedOrg;
        } catch (error) {
            logger.error('Error updating organization', { error, id, data });
            throw error;
        }
    }

    /**
     * Delete organization with cascade validation
     * SRP: Single responsibility for organization deletion with business rules
     */
    public async deleteOrganization(id: string): Promise<Organization> {
        try {
            logger.info('Deleting organization', { id });

            // Check if organization exists
            const organization = await this.getOrganizationById(id);
            if (!organization) {
                throw new Error('Organization not found');
            }

            // Check if organization has active recruiters
            if (organization.recruiters && organization.recruiters.length > 0) {
                throw new Error('Cannot delete organization with active recruiters');
            }

            // Check if organization has active jobs
            if (organization.jobs && organization.jobs.length > 0) {
                throw new Error('Cannot delete organization with active jobs');
            }

            const deletedOrg = await this.delete(id);

            logger.info('Organization deleted successfully', { id, name: deletedOrg.name });
            return deletedOrg;
        } catch (error) {
            logger.error('Error deleting organization', { error, id });
            throw error;
        }
    }

    /**
     * Get organization statistics
     * SRP: Single responsibility for organization analytics
     */
    public async getOrganizationStats(id: string): Promise<{
        totalRecruiters: number;
        activeRecruiters: number;
        totalJobs: number;
        activeJobs: number;
        totalApplications: number;
    }> {
        try {
            logger.debug('Getting organization statistics', { id });

            const [
                totalRecruiters,
                activeRecruiters,
                totalJobs,
                activeJobs,
                totalApplications
            ] = await Promise.all([
                this.prisma.recruiter.count({ where: { organizationId: id } }),
                this.prisma.recruiter.count({ where: { organizationId: id, isActive: true } }),
                this.prisma.job.count({ where: { organizationId: id } }),
                this.prisma.job.count({ where: { organizationId: id, isActive: true } }),
                this.prisma.application.count({
                    where: {
                        job: {
                            organizationId: id
                        }
                    }
                }),
            ]);

            return {
                totalRecruiters,
                activeRecruiters,
                totalJobs,
                activeJobs,
                totalApplications,
            };
        } catch (error) {
            logger.error('Error getting organization statistics', { error, id });
            throw error;
        }
    }

    /**
     * Search organizations by name or industry
     * SRP: Single responsibility for organization search
     */
    public async searchOrganizations(
        query: string,
        params: PaginationParams = {}
    ): Promise<PaginatedResponse<Organization>> {
        try {
            logger.debug('Searching organizations', { query, params });

            const where = {
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { industry: { contains: query, mode: 'insensitive' } },
                    { description: { contains: query, mode: 'insensitive' } },
                ],
            };

            return await this.findAll(params, where);
        } catch (error) {
            logger.error('Error searching organizations', { error, query, params });
            throw error;
        }
    }

    /**
     * Get organizations by industry
     * SRP: Single responsibility for industry-based filtering
     */
    public async getOrganizationsByIndustry(
        industry: string,
        params: PaginationParams = {}
    ): Promise<PaginatedResponse<Organization>> {
        try {
            logger.debug('Getting organizations by industry', { industry, params });

            const where = { industry };
            return await this.findAll(params, where);
        } catch (error) {
            logger.error('Error getting organizations by industry', { error, industry, params });
            throw error;
        }
    }

    /**
     * Get organizations by size
     * SRP: Single responsibility for size-based filtering
     */
    public async getOrganizationsBySize(
        size: string,
        params: PaginationParams = {}
    ): Promise<PaginatedResponse<Organization>> {
        try {
            logger.debug('Getting organizations by size', { size, params });

            const where = { size };
            return await this.findAll(params, where);
        } catch (error) {
            logger.error('Error getting organizations by size', { error, size, params });
            throw error;
        }
    }
} 