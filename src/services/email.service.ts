import nodemailer from 'nodemailer';
import logger from '../utils/logger';

export interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

export interface ApplicationNotificationData {
    to: string;
    jobTitle: string;
    organizationName: string;
    applicationUrl: string;
    isNewUser: boolean;
}

export interface WelcomeEmailWithCredentialsData {
    to: string;
    firstName: string;
    password: string;
    jobTitle: string;
    organizationName: string;
    applicationUrl: string;
}

export interface ApplicationStatusUpdateData {
    to: string;
    firstName: string;
    status: string;
    jobTitle: string;
    organizationName: string;
}

export interface InterviewInvitationData {
    firstName: string;
    lastName: string;
    scheduledAt: Date;
    mode: 'live' | 'async';
    durationMinutes: number;
    timezone: string;
}

export class EmailService {
    private transporter: nodemailer.Transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env['SMTP_HOST'] || 'smtp.gmail.com',
            port: parseInt(process.env['SMTP_PORT'] || '587'),
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env['SMTP_USER'],
                pass: process.env['SMTP_PASS'],
            },
        });
    }

    /**
     * Send email using SMTP
     */
    public async sendEmail(options: EmailOptions): Promise<void> {
        try {
            const mailOptions = {
                from: process.env['SMTP_FROM'] || process.env['SMTP_USER'],
                to: options.to,
                subject: options.subject,
                html: options.html,
                text: options.text,
            };

            const info = await this.transporter.sendMail(mailOptions);
            logger.info('Email sent successfully', {
                messageId: info.messageId,
                to: options.to,
                subject: options.subject
            });
        } catch (error) {
            logger.error('Error sending email', { error, to: options.to });
            throw new Error('Failed to send email');
        }
    }

    /**
     * Send email verification email
     */
    public async sendVerificationEmail(email: string, token: string, firstName: string): Promise<void> {
        const verificationUrl = `${process.env['FRONTEND_URL'] || 'http://localhost:3000'}/verify-email?token=${token}`;

        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Welcome to Our Platform!</h2>
                <p>Hi ${firstName},</p>
                <p>Thank you for signing up! Please verify your email address by clicking the button below:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${verificationUrl}" 
                       style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                        Verify Email Address
                    </a>
                </div>
                <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
                <p>This link will expire in 24 hours.</p>
                <p>If you didn't create an account, you can safely ignore this email.</p>
                <br>
                <p>Best regards,<br>The Team</p>
            </div>
        `;

        await this.sendEmail({
            to: email,
            subject: 'Verify Your Email Address',
            html,
        });
    }

    /**
     * Send password reset email
     */
    public async sendPasswordResetEmail(email: string, token: string, firstName: string): Promise<void> {
        const resetUrl = `${process.env['FRONTEND_URL'] || 'http://localhost:3000'}/reset-password?token=${token}`;

        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Password Reset Request</h2>
                <p>Hi ${firstName},</p>
                <p>We received a request to reset your password. Click the button below to create a new password:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetUrl}" 
                       style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                        Reset Password
                    </a>
                </div>
                <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #666;">${resetUrl}</p>
                <p>This link will expire in 1 hour.</p>
                <p>If you didn't request a password reset, you can safely ignore this email.</p>
                <br>
                <p>Best regards,<br>The Team</p>
            </div>
        `;

        await this.sendEmail({
            to: email,
            subject: 'Reset Your Password',
            html,
        });
    }

    /**
     * Send resend verification email
     */
    public async sendResendVerificationEmail(email: string, token: string, firstName: string): Promise<void> {
        const verificationUrl = `${process.env['FRONTEND_URL'] || 'http://localhost:3000'}/verify-email?token=${token}`;

        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Email Verification</h2>
                <p>Hi ${firstName},</p>
                <p>You requested a new verification email. Please verify your email address by clicking the button below:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${verificationUrl}" 
                       style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                        Verify Email Address
                    </a>
                </div>
                <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
                <p>This link will expire in 24 hours.</p>
                <p>If you didn't request this email, you can safely ignore it.</p>
                <br>
                <p>Best regards,<br>The Team</p>
            </div>
        `;

        await this.sendEmail({
            to: email,
            subject: 'Email Verification',
            html,
        });
    }

    /**
     * Send application notification to existing candidate
     */
    public async sendApplicationNotification(data: ApplicationNotificationData): Promise<void> {
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">New Job Application</h2>
                <p>Hello!</p>
                <p>You have been invited to apply for a position at <strong>${data.organizationName}</strong>.</p>
                <p><strong>Job Title:</strong> ${data.jobTitle}</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${data.applicationUrl}" 
                       style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                        View Application
                    </a>
                </div>
                <p>Click the button above to view your application details and track your application status.</p>
                <p>If you have any questions, please don't hesitate to reach out to the hiring team.</p>
                <br>
                <p>Best regards,<br>The ${data.organizationName} Team</p>
            </div>
        `;

        await this.sendEmail({
            to: data.to,
            subject: `Application Invitation - ${data.jobTitle} at ${data.organizationName}`,
            html,
        });
    }

    /**
     * Send welcome email with credentials to new candidate
     */
    public async sendWelcomeEmailWithCredentials(data: WelcomeEmailWithCredentialsData): Promise<void> {
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Welcome to Our Platform!</h2>
                <p>Hi ${data.firstName},</p>
                <p>You have been invited to apply for a position at <strong>${data.organizationName}</strong>.</p>
                <p><strong>Job Title:</strong> ${data.jobTitle}</p>
                <p>We've created an account for you with the following credentials:</p>
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>Email:</strong> ${data.to}</p>
                    <p><strong>Temporary Password:</strong> ${data.password}</p>
                </div>
                <p><strong>Important:</strong> Please change your password immediately after your first login for security reasons.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${data.applicationUrl}" 
                       style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                        View Application
                    </a>
                </div>
                <p>Click the button above to view your application details and track your application status.</p>
                <p>If you have any questions, please don't hesitate to reach out to the hiring team.</p>
                <br>
                <p>Best regards,<br>The ${data.organizationName} Team</p>
            </div>
        `;

        await this.sendEmail({
            to: data.to,
            subject: `Welcome - Application for ${data.jobTitle} at ${data.organizationName}`,
            html,
        });
    }

    /**
     * Send application status update notification
     */
    public async sendApplicationStatusUpdate(data: ApplicationStatusUpdateData): Promise<void> {
        const statusColors: Record<string, string> = {
            'PENDING': '#ffc107',
            'REVIEWING': '#17a2b8',
            'SHORTLISTED': '#28a745',
            'REJECTED': '#dc3545',
            'HIRED': '#28a745',
            'WITHDRAWN': '#6c757d'
        };

        const statusColor = statusColors[data.status] || '#6c757d';

        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Application Status Update</h2>
                <p>Hi ${data.firstName},</p>
                <p>Your application status has been updated for the position at <strong>${data.organizationName}</strong>.</p>
                <p><strong>Job Title:</strong> ${data.jobTitle}</p>
                <div style="background-color: ${statusColor}; color: white; padding: 10px; border-radius: 5px; margin: 20px 0; text-align: center;">
                    <strong>New Status: ${data.status}</strong>
                </div>
                <p>Please log in to your account to view more details about your application.</p>
                <p>If you have any questions about this update, please don't hesitate to reach out to the hiring team.</p>
                <br>
                <p>Best regards,<br>The ${data.organizationName} Team</p>
            </div>
        `;

        await this.sendEmail({
            to: data.to,
            subject: `Application Status Update - ${data.status} for ${data.jobTitle}`,
            html,
        });
    }

    /**
     * Send interview invitation email
     */
    public async sendInterviewInvitation(email: string, data: InterviewInvitationData): Promise<void> {
        const interviewDate = new Date(data.scheduledAt).toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: data.timezone
        });

        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Interview Invitation</h2>
                <p>Hi ${data.firstName} ${data.lastName},</p>
                <p>Congratulations! You have been invited for an interview.</p>
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>Interview Date:</strong> ${interviewDate}</p>
                    <p><strong>Mode:</strong> ${data.mode === 'live' ? 'Live Interview' : 'Asynchronous Interview'}</p>
                    <p><strong>Duration:</strong> ${data.durationMinutes} minutes</p>
                    <p><strong>Timezone:</strong> ${data.timezone}</p>
                </div>
                <p>Please log in to your account to access the interview platform and prepare for your interview.</p>
                <p>If you need to reschedule or have any questions, please contact the hiring team as soon as possible.</p>
                <br>
                <p>Best regards,<br>The Hiring Team</p>
            </div>
        `;

        await this.sendEmail({
            to: email,
            subject: `Interview Invitation - ${interviewDate}`,
            html,
        });
    }
} 