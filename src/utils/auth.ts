// Authentication utilities for JWT and password hashing
// Following security best practices with bcrypt hashing and JWT tokens

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthToken } from '@/types';
import { getCurrentUTCTimestamp } from './datetime';

// Security: bcrypt hashing protects user passwords
export class AuthUtils {
    private static readonly SALT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');
    private static readonly JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
    private static readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

    /**
     * Hash a password using bcrypt
     * Security: bcrypt hashing protects user passwords
     */
    public static async hashPassword(password: string): Promise<string> {
        try {
            const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS);
            return hashedPassword;
        } catch (error) {
            throw new Error('Password hashing failed');
        }
    }

    /**
     * Compare a password with its hash
     * Security: bcrypt comparison for secure password verification
     */
    public static async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
        try {
            return await bcrypt.compare(password, hashedPassword);
        } catch (error) {
            throw new Error('Password comparison failed');
        }
    }

    /**
     * Generate JWT token for user authentication
     * Security: JWT authentication ensures secure user sessions
     */
    public static generateToken(userId: string, email: string, firstName: string, lastName: string, type: 'recruiter' | 'candidate' | 'user'): AuthToken {
        try {
            const payload = {
                userId,
                email,
                firstName,
                lastName,
                type,
                iat: Math.floor(getCurrentUTCTimestamp() / 1000),
            };

            const token = jwt.sign(payload, this.JWT_SECRET, {
                expiresIn: this.JWT_EXPIRES_IN,
            });

            return {
                token,
                expiresIn: this.JWT_EXPIRES_IN,
                user: {
                    id: userId,
                    email,
                    firstName,
                    lastName,
                    type,
                },
            };
        } catch (error) {
            throw new Error('Token generation failed');
        }
    }

    /**
     * Verify and decode JWT token
     * Security: JWT verification for secure token validation
     */
    public static verifyToken(token: string): any {
        try {
            const decoded = jwt.verify(token, this.JWT_SECRET);
            return decoded;
        } catch (error) {
            if (error instanceof jwt.JsonWebTokenError) {
                throw new Error('Invalid token');
            } else if (error instanceof jwt.TokenExpiredError) {
                throw new Error('Token expired');
            } else {
                throw new Error('Token verification failed');
            }
        }
    }

    /**
     * Extract token from Authorization header
     * Security: Proper token extraction from headers
     */
    public static extractTokenFromHeader(authHeader: string | undefined): string {
        if (!authHeader) {
            throw new Error('Authorization header missing');
        }

        if (!authHeader.startsWith('Bearer ')) {
            throw new Error('Invalid authorization header format');
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        if (!token) {
            throw new Error('Token missing from authorization header');
        }

        return token;
    }

    /**
     * Generate a random password for temporary access
     * Security: Secure random password generation
     */
    public static generateRandomPassword(length: number = 12): string {
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let password = '';

        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * charset.length);
            password += charset[randomIndex];
        }

        return password;
    }

    /**
     * Validate password strength
     * Security: Password strength validation for better security
     */
    public static validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (password.length < 8) {
            errors.push('Password must be at least 8 characters long');
        }

        if (!/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter');
        }

        if (!/[a-z]/.test(password)) {
            errors.push('Password must contain at least one lowercase letter');
        }

        if (!/[0-9]/.test(password)) {
            errors.push('Password must contain at least one number');
        }

        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            errors.push('Password must contain at least one special character');
        }

        return {
            isValid: errors.length === 0,
            errors,
        };
    }
} 