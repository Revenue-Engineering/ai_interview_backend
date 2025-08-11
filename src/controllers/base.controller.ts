import { Request, Response } from 'express';
import { BaseService } from '../services/base.service';
import logger from '../utils/logger';
import { serializeForJSON, serializeEntityResponse, serializePaginatedResponse } from '../utils/serializer';

export abstract class BaseController<T, CreateDto, UpdateDto> {
    protected service: BaseService<T, CreateDto, UpdateDto>;

    constructor(service: BaseService<T, CreateDto, UpdateDto>) {
        this.service = service;
    }

    /**
     * Get all entities with pagination
     */
    public getAll = async (req: Request, res: Response): Promise<void> => {
        try {
            const page = parseInt(req.query['page'] as string) || 1;
            const limit = parseInt(req.query['limit'] as string) || 10;
            const sortBy = (req.query['sortBy'] as string) || 'createdAt';
            const sortOrder = (req.query['sortOrder'] as string) || 'desc';

            const result = await this.service.findAll({ page, limit, sortBy, sortOrder: sortOrder as 'asc' | 'desc' });

            const serializedResult = serializePaginatedResponse(result);

            res.status(200).json({
                success: true,
                data: serializedResult.data,
                pagination: serializedResult.pagination,
            });
        } catch (error) {
            logger.error('Error in getAll', { error });
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: 'Failed to retrieve data',
            });
        }
    };

    /**
     * Get entity by ID
     */
    public getById = async (req: Request, res: Response): Promise<void> => {
        try {
            const id = req.params['id'];
            if (!id) {
                res.status(400).json({
                    success: false,
                    error: 'Bad request',
                    message: 'Entity ID is required',
                });
                return;
            }

            const entity = await this.service.findById(id);

            if (!entity) {
                res.status(404).json({
                    success: false,
                    error: 'Not found',
                    message: 'Entity not found',
                });
                return;
            }

            res.status(200).json({
                success: true,
                data: serializeEntityResponse(entity),
            });
        } catch (error) {
            logger.error('Error in getById', { error, id: req.params['id'] });
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: 'Failed to retrieve entity',
            });
        }
    };

    /**
     * Create new entity
     */
    public create = async (req: Request, res: Response): Promise<void> => {
        try {
            const entity = await this.service.create(req.body);

            res.status(201).json({
                success: true,
                data: serializeEntityResponse(entity),
            });
        } catch (error) {
            logger.error('Error in create', { error });
            res.status(400).json({
                success: false,
                error: 'Bad request',
                message: error instanceof Error ? error.message : 'Failed to create entity',
            });
        }
    };

    /**
     * Update entity
     */
    public update = async (req: Request, res: Response): Promise<void> => {
        try {
            const id = req.params['id'];
            if (!id) {
                res.status(400).json({
                    success: false,
                    error: 'Bad request',
                    message: 'Entity ID is required',
                });
                return;
            }

            const entity = await this.service.update(id, req.body);

            if (!entity) {
                res.status(404).json({
                    success: false,
                    error: 'Not found',
                    message: 'Entity not found',
                });
                return;
            }

            res.status(200).json({
                success: true,
                data: serializeEntityResponse(entity),
            });
        } catch (error) {
            logger.error('Error in update', { error, id: req.params['id'] });
            res.status(400).json({
                success: false,
                error: 'Bad request',
                message: error instanceof Error ? error.message : 'Failed to update entity',
            });
        }
    };

    /**
     * Delete entity
     */
    public delete = async (req: Request, res: Response): Promise<void> => {
        try {
            const id = req.params['id'];
            if (!id) {
                res.status(400).json({
                    success: false,
                    error: 'Bad request',
                    message: 'Entity ID is required',
                });
                return;
            }

            const deleted = await this.service.delete(id);

            if (!deleted) {
                res.status(404).json({
                    success: false,
                    error: 'Not found',
                    message: 'Entity not found',
                });
                return;
            }

            res.status(200).json({
                success: true,
                message: 'Entity deleted successfully',
            });
        } catch (error) {
            logger.error('Error in delete', { error, id: req.params['id'] });
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: 'Failed to delete entity',
            });
        }
    };
} 