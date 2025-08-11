// Recruiter service using Service-Repository pattern
// Following SOLID principles with complex business logic for signup and organization management

import { PrismaClient } from '@prisma/client';
import { BaseService } from '@/services/base.service';
import {
    IUser,
    IUserRegistrationInput,
    IUpdateUserInput,
    IAuthToken,
    IUserLoginInput,
    IForgotPasswordInput,
    IResetPasswordInput,
    IVerifyEmailInput,
    IResendVerificationInput,
    ICandidateRegistrationInput
} from '@/types';
import { OrganizationService } from '@/services/organization.service';
import { EmailService } from '@/services/email.service';
import { AuthUtils } from '@/utils/auth';
import { serializeUser } from '@/utils/serializer';
import logger from '@/utils/logger';
import crypto from 'crypto';
import { getCurrentUTC, addDaysUTC, addHoursUTC } from '@/utils/datetime';

// SRP: Auth service handles auth-related business logic
export class AuthService extends BaseService<IUser, IUserRegistrationInput, IUpdateUserInput> {
    private organizationService: OrganizationService;
    private emailService: EmailService;

    constructor(prisma: PrismaClient, organizationService: OrganizationService) {
        // DIP: Dependency injection through constructor
        super(prisma, 'user');
        this.organizationService = organizationService;
        this.emailService = new EmailService();
    }

    // Add this helper function after the constructor
    private convertUserTypeToDatabaseFormat(userType: string): string {
        switch (userType?.toLowerCase()) {
            case 'recruiter':
                return 'RECRUITER';
            case 'candidate':
                return 'CANDIDATE';
            case 'user':
                return 'USER';
            default:
                throw new Error(`Invalid userType: ${userType}`);
        }
    }


    /**
     * Recruiter signup with organization handling
     * SRP: Single responsibility for recruiter signup process
     * OCP: Open for extension (can add more signup flows) but closed for modification
     */
    public async signup(data: IUserRegistrationInput): Promise<{ user: IUser; token: IAuthToken }> {
        try {
            console.log('user', data);
            logger.info('Starting recruiter signup process', { email: data.email });
            // console.log('data', data.email);
            // // Check if recruiter already exists
            // const existingRecruiter = await this.findOneByCriteria({ email: data.email });
            // console.log('existingRecruiter', existingRecruiter);
            // if (existingRecruiter) {
            //     throw new Error('Recruiter with this email already exists');
            // }

            // Hash password
            const hashedPassword = await AuthUtils.hashPassword(data.password);
            console.log('hashedPassword', hashedPassword);
            let organizationId: string;

            // Handle organization logic
            if (data.organizationId) {
                // Link to existing organization
                logger.debug('Linking recruiter to existing organization', { organizationId: data.organizationId });

                const organization = await this.organizationService.findById(data.organizationId);
                if (!organization) {
                    throw new Error('Organization not found');
                }

                organizationId = data.organizationId;
            } else if (data.organization) {
                // Create new organization
                logger.debug('Creating new organization for recruiter', { organizationName: data.organization.name });

                const newOrganization = await this.organizationService.createOrganization(data.organization);
                organizationId = newOrganization.id.toString();
            } else {
                throw new Error('Either organizationId or organization data must be provided');
            }
            // Create recruiter
            const user = await this.prisma.user.create({
                data: {
                    email: data.email,
                    password: hashedPassword,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    userType: this.convertUserTypeToDatabaseFormat(data.userType),
                    userRole: this.convertUserTypeToDatabaseFormat(data.userType),
                    organizationId: parseInt(organizationId),
                }
            });



            // Generate authentication token
            const token = AuthUtils.generateToken(
                user.id.toString(),
                user.email,
                user.firstName,
                user.lastName,
                'user',
            );

            // Update last login
            await this.update(user.id.toString(), {});

            logger.info('Recruiter signup completed successfully', {
                id: user.id,
                email: user.email,
                organizationId
            });

            // Send verification email
            await this.sendVerificationEmail(user);

            return { user, token };
        } catch (error) {
            logger.error('Error during recruiter signup', { error, email: data.email });
            throw error;
        }
    }

    /**
     * Candidate signup with candidate details
     * SRP: Single responsibility for candidate signup process
     */
    public async candidateSignup(data: ICandidateRegistrationInput): Promise<{ user: IUser; token: IAuthToken }> {
        try {
            logger.info('Starting candidate signup process', { email: data.email });

            // Check if candidate already exists
            const existingCandidate = await this.findOneByCriteria({ email: data.email });
            if (existingCandidate) {
                throw new Error('Candidate with this email already exists');
            }

            // Hash password
            const hashedPassword = await AuthUtils.hashPassword(data.password);

            // Create candidate with candidate details in a transaction
            const result = await this.prisma.$transaction(async (prisma) => {
                // Create user record
                const userData = {
                    email: data.email,
                    password: hashedPassword,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    userType: 'CANDIDATE',
                    userRole: 'CANDIDATE',
                };

                const user = await prisma.user.create({
                    data: userData,
                });

                // Create candidate details
                const candidateDetailsData: any = {
                    userId: user.id,
                    status: 'ACTIVE',
                };

                // Only add defined values to avoid undefined issues
                if (data.candidateDetails.phoneNumber) candidateDetailsData.phoneNumber = data.candidateDetails.phoneNumber;
                if (data.candidateDetails.location) candidateDetailsData.location = data.candidateDetails.location;
                if (data.candidateDetails.skills) candidateDetailsData.skills = data.candidateDetails.skills;
                if (data.candidateDetails.education) candidateDetailsData.education = data.candidateDetails.education;
                if (data.candidateDetails.experience) candidateDetailsData.experience = data.candidateDetails.experience;
                if (data.candidateDetails.resumeUrl) candidateDetailsData.resumeUrl = data.candidateDetails.resumeUrl;
                if (data.candidateDetails.portfolioUrl) candidateDetailsData.portfolioUrl = data.candidateDetails.portfolioUrl;
                if (data.candidateDetails.linkedInUrl) candidateDetailsData.linkedInUrl = data.candidateDetails.linkedInUrl;
                if (data.candidateDetails.githubUrl) candidateDetailsData.githubUrl = data.candidateDetails.githubUrl;
                if (data.candidateDetails.desiredJobTitle) candidateDetailsData.desiredJobTitle = data.candidateDetails.desiredJobTitle;
                if (data.candidateDetails.preferredWorkLocation) candidateDetailsData.preferredWorkLocation = data.candidateDetails.preferredWorkLocation;
                if (data.candidateDetails.salaryExpectation) candidateDetailsData.salaryExpectation = data.candidateDetails.salaryExpectation;
                if (data.candidateDetails.noticePeriod) candidateDetailsData.noticePeriod = data.candidateDetails.noticePeriod;
                if (data.candidateDetails.workAuthorization) candidateDetailsData.workAuthorization = data.candidateDetails.workAuthorization;
                if (data.candidateDetails.linkedInProfile) candidateDetailsData.linkedInProfile = data.candidateDetails.linkedInProfile;
                if (data.candidateDetails.preferredJobType) candidateDetailsData.preferredJobType = data.candidateDetails.preferredJobType;
                if (data.candidateDetails.languagesSpoken) candidateDetailsData.languagesSpoken = data.candidateDetails.languagesSpoken;

                await prisma.candidateDetails.create({
                    data: candidateDetailsData,
                });

                return user;
            });

            // Generate authentication token
            const token = AuthUtils.generateToken(
                result.id.toString(),
                result.email,
                result.firstName,
                result.lastName,
                'user',
            );

            logger.info('Candidate signup completed successfully', {
                id: result.id,
                email: result.email,
            });

            // Send verification email
            await this.sendVerificationEmail(result);

            return { user: result, token };
        } catch (error) {
            logger.error('Error during candidate signup', { error, email: data.email });
            throw error;
        }
    }

    /**
     * Send verification email to user
     */
    private async sendVerificationEmail(user: IUser): Promise<void> {
        try {
            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = addDaysUTC(getCurrentUTC(), 1); // 24 hours

            await this.update(user.id.toString(), {
                emailVerificationToken: token,
                emailVerificationExpires: expiresAt,
            });

            await this.emailService.sendVerificationEmail(user.email, token, user.firstName);
        } catch (error) {
            logger.error('Error sending verification email', { error, userId: user.id });
            // Don't throw error to avoid breaking signup flow
        }
    }

    /**
     * Recruiter login with authentication
     * SRP: Single responsibility for recruiter authentication
     */
    public async login(data: IUserLoginInput): Promise<{ user: IUser; token: IAuthToken }> {
        try {
            logger.info('User login attempt', { email: data.email });

            // Find user by email
            const user = await this.findOneByCriteria({
                email: data.email,
                // isActive: true
            });

            if (!user) {
                throw new Error('Invalid email or password');
            }

            // Verify password
            const isPasswordValid = await AuthUtils.comparePassword(data.password, user.password);
            if (!isPasswordValid) {
                throw new Error('Invalid email or password');
            }

            // Generate authentication token
            const token = AuthUtils.generateToken(
                user.id.toString(),
                user.email,
                user.firstName,
                user.lastName,
                'user',
            );

            // Update last login
            await this.update(user.id.toString(), {});

            logger.info('User login successful', { id: user.id, email: user.email });

            return { user, token: token.token };
        } catch (error) {
            logger.error('Error during user login', { error, email: data.email });
            throw error;
        }
    }

    public async changePassword(id: string, currentPassword: string, newPassword: string): Promise<void> {
        try {
            logger.info('Changing password for user', { id });
            const user = await this.findById(id);
            if (!user) {
                throw new Error('User not found');
            }

            const isPasswordValid = await AuthUtils.comparePassword(currentPassword, user.password);
            if (!isPasswordValid) {
                throw new Error('Invalid current password');
            }

            const hashedNewPassword = await AuthUtils.hashPassword(newPassword);
            await this.update(id, { password: hashedNewPassword });
            logger.info('Password changed successfully', { id });
        } catch (error) {
            logger.error('Error in changePassword', { error, id, currentPassword, newPassword });
            throw error;
        }
    }

    /**
     * Forgot password - send reset email
     */
    public async forgotPassword(data: IForgotPasswordInput): Promise<void> {
        try {
            logger.info('Forgot password request', { email: data.email });

            const user = await this.findOneByCriteria({ email: data.email });
            if (!user) {
                // Don't reveal if user exists or not for security
                logger.info('Forgot password request for non-existent email', { email: data.email });
                return;
            }

            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = addHoursUTC(getCurrentUTC(), 1); // 1 hour

            await this.update(user.id.toString(), {
                passwordResetToken: token,
                passwordResetExpires: expiresAt,
            });

            await this.emailService.sendPasswordResetEmail(user.email, token, user.firstName);

            logger.info('Password reset email sent successfully', { email: data.email });
        } catch (error) {
            logger.error('Error in forgot password', { error, email: data.email });
            throw new Error('Failed to process forgot password request');
        }
    }

    /**
     * Reset password using token
     */
    public async resetPassword(data: IResetPasswordInput): Promise<void> {
        try {
            logger.info('Password reset attempt', { token: data.token.substring(0, 10) + '...' });

            const user = await this.findOneByCriteria({
                passwordResetToken: data.token,
                passwordResetExpires: { gt: new Date() },
            });

            if (!user) {
                throw new Error('Invalid or expired reset token');
            }

            // Validate new password strength
            // const passwordValidation = AuthUtils.validatePasswordStrength(data.password);
            // const passwordValidation = data.password;
            // if (!passwordValidation.isValid) {
            //     throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
            // }

            // Hash new password
            const hashedPassword = await AuthUtils.hashPassword(data.password);

            // Update password and clear reset token
            await this.update(user.id.toString(), {
                password: hashedPassword,
                passwordResetToken: null,
                passwordResetExpires: null,
            });

            logger.info('Password reset successful', { userId: user.id });
        } catch (error) {
            logger.error('Error in reset password', { error });
            throw error;
        }
    }

    /**
     * Verify email using token
     */
    public async verifyEmail(data: IVerifyEmailInput): Promise<void> {
        try {
            logger.info('Email verification attempt', { token: data.token.substring(0, 10) + '...' });

            const user = await this.findOneByCriteria({
                emailVerificationToken: data.token,
                emailVerificationExpires: { gt: getCurrentUTC() },
            });

            if (!user) {
                throw new Error('Invalid or expired verification token');
            }

            // Mark email as verified
            await this.update(user.id.toString(), {
                emailVerifiedAt: getCurrentUTC(),
                emailVerificationToken: null,
                emailVerificationExpires: null,
            });

            logger.info('Email verified successfully', { userId: user.id });
        } catch (error) {
            logger.error('Error in email verification', { error });
            throw error;
        }
    }

    /**
     * Resend verification email
     */
    public async resendVerification(data: IResendVerificationInput): Promise<void> {
        try {
            logger.info('Resend verification request', { email: data.email });

            const user = await this.findOneByCriteria({ email: data.email });
            if (!user) {
                throw new Error('User not found');
            }

            if (user.emailVerifiedAt) {
                throw new Error('Email is already verified');
            }

            // Check if there's an existing valid token
            if (user.emailVerificationExpires && user.emailVerificationExpires > getCurrentUTC()) {
                throw new Error('Verification email already sent. Please check your inbox or wait before requesting another.');
            }

            await this.sendVerificationEmail(user);

            logger.info('Verification email resent successfully', { email: data.email });
        } catch (error) {
            logger.error('Error in resend verification', { error, email: data.email });
            throw error;
        }
    }

    /**
 * Get current user profile
 */
    public async getCurrentUser(userId: string): Promise<any> {
        try {
            logger.debug('Getting current user profile', { userId });

            const user = await this.findById(userId);
            if (!user) {
                return null;
            }

            // Use the serializer utility to handle BigInt and sensitive data
            return serializeUser(user);
        } catch (error) {
            logger.error('Error getting current user profile', { error, userId });
            throw error;
        }
    }

    /**
     * Logout user (invalidate token on client side)
     * Note: JWT tokens are stateless, so actual invalidation happens on client
     * In a more secure setup, you might want to maintain a blacklist of tokens
     */
    public async logout(userId: string): Promise<void> {
        try {
            logger.info('User logout', { userId });
            // In a stateless JWT setup, logout is handled on the client side
            // You could implement token blacklisting here if needed
        } catch (error) {
            logger.error('Error in logout', { error, userId });
            throw error;
        }
    }
} 