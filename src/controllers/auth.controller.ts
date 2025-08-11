import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { AuthService } from '../services/auth.service';
import { OrganizationService } from '../services/organization.service';
import { getDatabaseClient } from '../utils/database';
import { IUser, IUserRegistrationInput, IUpdateUserInput } from '../types';
import { serializeUser, serializeForJSON, serializeEntityResponse, serializePaginatedResponse } from '../utils/serializer';
import logger from '../utils/logger';

export class AuthController extends BaseController<IUser, IUserRegistrationInput, IUpdateUserInput> {
    private authService: AuthService;

    constructor() {
        const db = getDatabaseClient();
        const organizationService = new OrganizationService(db);
        const authService = new AuthService(db, organizationService);
        super(authService);
        this.authService = authService;
    }

    /**
     * Recruiter signup
     */
    public signup = async (req: Request, res: Response): Promise<void> => {
        try {
            const result = await this.authService.signup(req.body);

            res.status(201).json({
                success: true,
                data: {
                    user: serializeUser(result.user),
                    token: result.token,
                },
                message: 'Recruiter registered successfully',
            });
        } catch (error) {
            logger.error('Error in recruiter signup', { error });
            res.status(400).json({
                success: false,
                error: 'Bad request',
                message: error instanceof Error ? error.message : 'Failed to register recruiter',
            });
        }
    };

    /**
     * Candidate signup
     */
    public candidateSignup = async (req: Request, res: Response): Promise<void> => {
        try {
            const result = await this.authService.candidateSignup(req.body);

            res.status(201).json({
                success: true,
                data: {
                    user: serializeUser(result.user),
                    token: result.token,
                },
                message: 'Candidate registered successfully',
            });
        } catch (error) {
            logger.error('Error in candidate signup', { error });
            res.status(400).json({
                success: false,
                error: 'Bad request',
                message: error instanceof Error ? error.message : 'Failed to register candidate',
            });
        }
    };

    /**
     * Recruiter login
     */
    public login = async (req: Request, res: Response): Promise<void> => {
        try {
            const result = await this.authService.login(req.body);

            res.status(200).json({
                success: true,
                data: {
                    user: serializeUser(result.user),
                    token: result.token,
                },
                message: 'Login successful',
            });
        } catch (error) {
            logger.error('Error in recruiter login', { error });
            res.status(401).json({
                success: false,
                error: 'Unauthorized',
                message: error instanceof Error ? error.message : 'Invalid credentials',
            });
        }
    };

    /**
     * Get all recruiters with pagination
     */
    public getAllRecruiters = async (req: Request, res: Response): Promise<void> => {
        try {
            const page = parseInt(req.query['page'] as string) || 1;
            const limit = parseInt(req.query['limit'] as string) || 10;
            const sortBy = (req.query['sortBy'] as string) || 'createdAt';
            const sortOrder = (req.query['sortOrder'] as string) || 'desc';

            const result = await this.authService.findAll({ page, limit, sortBy, sortOrder: sortOrder as 'asc' | 'desc' });

            const serializedResult = serializePaginatedResponse(result);

            res.status(200).json({
                success: true,
                data: serializedResult.data,
                pagination: serializedResult.pagination,
            });
        } catch (error) {
            logger.error('Error in getAllRecruiters', { error });
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: 'Failed to retrieve recruiters',
            });
        }
    };

    /**
     * Get recruiter by ID
     */
    public getRecruiterById = async (req: Request, res: Response): Promise<void> => {
        try {
            const id = req.params['id'];
            if (!id) {
                res.status(400).json({
                    success: false,
                    error: 'Bad request',
                    message: 'Recruiter ID is required',
                });
                return;
            }

            const recruiter = await this.authService.findById(id);

            if (!recruiter) {
                res.status(404).json({
                    success: false,
                    error: 'Not found',
                    message: 'Recruiter not found',
                });
                return;
            }

            res.status(200).json({
                success: true,
                data: serializeEntityResponse(recruiter),
            });
        } catch (error) {
            logger.error('Error in getRecruiterById', { error, id: req.params['id'] });
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: 'Failed to retrieve recruiter',
            });
        }
    };

    /**
     * Get recruiter statistics
     */
    public getRecruiterStats = async (req: Request, res: Response): Promise<void> => {
        try {
            const id = req.params['id'];
            if (!id) {
                res.status(400).json({
                    success: false,
                    error: 'Bad request',
                    message: 'Recruiter ID is required',
                });
                return;
            }

            // Note: This method doesn't exist in AuthService, so we'll return a placeholder
            // You may need to implement this in the AuthService or remove this endpoint
            res.status(501).json({
                success: false,
                error: 'Not implemented',
                message: 'Recruiter statistics endpoint not implemented',
            });
        } catch (error) {
            logger.error('Error in getRecruiterStats', { error, id: req.params['id'] });
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: 'Failed to retrieve recruiter statistics',
            });
        }
    };

    /**
     * Update recruiter
     */
    public updateRecruiter = async (req: Request, res: Response): Promise<void> => {
        try {
            const id = req.params['id'];
            if (!id) {
                res.status(400).json({
                    success: false,
                    error: 'Bad request',
                    message: 'Recruiter ID is required',
                });
                return;
            }

            const recruiter = await this.authService.update(id, req.body);

            if (!recruiter) {
                res.status(404).json({
                    success: false,
                    error: 'Not found',
                    message: 'Recruiter not found',
                });
                return;
            }

            res.status(200).json({
                success: true,
                data: serializeEntityResponse(recruiter),
            });
        } catch (error) {
            logger.error('Error in updateRecruiter', { error, id: req.params['id'] });
            res.status(400).json({
                success: false,
                error: 'Bad request',
                message: error instanceof Error ? error.message : 'Failed to update recruiter',
            });
        }
    };

    /**
     * Delete recruiter
     */
    public deleteRecruiter = async (req: Request, res: Response): Promise<void> => {
        try {
            const id = req.params['id'];
            if (!id) {
                res.status(400).json({
                    success: false,
                    error: 'Bad request',
                    message: 'Recruiter ID is required',
                });
                return;
            }

            const deleted = await this.authService.delete(id);

            if (!deleted) {
                res.status(404).json({
                    success: false,
                    error: 'Not found',
                    message: 'Recruiter not found',
                });
                return;
            }

            res.status(200).json({
                success: true,
                message: 'Recruiter deleted successfully',
            });
        } catch (error) {
            logger.error('Error in deleteRecruiter', { error, id: req.params['id'] });
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: 'Failed to delete recruiter',
            });
        }
    };

    /**
     * Change recruiter password
     */
    public changePassword = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = (req as any).user?.userId;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    error: 'Unauthorized',
                    message: 'User not authenticated',
                });
                return;
            }

            const { currentPassword, newPassword } = req.body;

            await this.authService.changePassword(userId, currentPassword, newPassword);

            res.status(200).json({
                success: true,
                message: 'Password changed successfully',
            });
        } catch (error) {
            logger.error('Error in changePassword', { error });
            res.status(400).json({
                success: false,
                error: 'Bad request',
                message: error instanceof Error ? error.message : 'Failed to change password',
            });
        }
    };

    /**
     * Forgot password
     */
    public forgotPassword = async (req: Request, res: Response): Promise<void> => {
        try {
            await this.authService.forgotPassword(req.body);

            res.status(200).json({
                success: true,
                message: 'If an account with that email exists, a password reset link has been sent.',
            });
        } catch (error) {
            logger.error('Error in forgotPassword', { error });
            res.status(400).json({
                success: false,
                error: 'Bad request',
                message: error instanceof Error ? error.message : 'Failed to process forgot password request',
            });
        }
    };

    /**
     * Reset password
     */
    public resetPassword = async (req: Request, res: Response): Promise<void> => {
        try {
            await this.authService.resetPassword(req.body);

            res.status(200).json({
                success: true,
                message: 'Password reset successfully',
            });
        } catch (error) {
            logger.error('Error in resetPassword', { error });
            res.status(400).json({
                success: false,
                error: 'Bad request',
                message: error instanceof Error ? error.message : 'Failed to reset password',
            });
        }
    };

    /**
     * Verify email
     */
    public verifyEmail = async (req: Request, res: Response): Promise<void> => {
        try {
            await this.authService.verifyEmail(req.body);

            res.status(200).json({
                success: true,
                message: 'Email verified successfully',
            });
        } catch (error) {
            logger.error('Error in verifyEmail', { error });
            res.status(400).json({
                success: false,
                error: 'Bad request',
                message: error instanceof Error ? error.message : 'Failed to verify email',
            });
        }
    };

    /**
     * Resend verification email
     */
    public resendVerification = async (req: Request, res: Response): Promise<void> => {
        try {
            await this.authService.resendVerification(req.body);

            res.status(200).json({
                success: true,
                message: 'Verification email sent successfully',
            });
        } catch (error) {
            logger.error('Error in resendVerification', { error });
            res.status(400).json({
                success: false,
                error: 'Bad request',
                message: error instanceof Error ? error.message : 'Failed to resend verification email',
            });
        }
    };

    /**
     * Get current user profile
     */
    public me = async (req: Request, res: Response): Promise<void> => {
        try {

            const userId = (req as any).user?.userId;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    error: 'Unauthorized',
                    message: 'User not authenticated',
                });
                return;
            }

            const user = await this.authService.getCurrentUser(userId);

            if (!user) {
                res.status(404).json({
                    success: false,
                    error: 'Not found',
                    message: 'User not found',
                });
                return;
            }
            console.log(user);

            // Ensure the user object is properly serialized for JSON response
            const serializedUser = serializeUser(user);

            res.status(200).json({
                success: true,
                message: 'User profile retrieved successfully',
                data: serializedUser
            });
        } catch (error) {
            logger.error('Error in me', { error });
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: 'Failed to get user profile',
            });
        }
    };

    /**
     * Logout user
     */
    public logout = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = (req as any).user?.userId;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    error: 'Unauthorized',
                    message: 'User not authenticated',
                });
                return;
            }

            await this.authService.logout(userId);

            res.status(200).json({
                success: true,
                message: 'Logged out successfully',
            });
        } catch (error) {
            logger.error('Error in logout', { error });
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: 'Failed to logout',
            });
        }
    };
} 