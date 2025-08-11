import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { ValidationMiddleware } from '../middlewares/validation.middleware';
import { AuthMiddleware } from '../middlewares/auth.middleware';
import { validationSchemas } from '../types/validation';

const router = Router();
const authController = new AuthController();

// Public routes (authentication)
router.post('/signup',
    ValidationMiddleware.validate(validationSchemas.createRecruiter),
    authController.signup
);

router.post('/candidate/signup',
    ValidationMiddleware.validate(validationSchemas.createCandidate),
    authController.candidateSignup
);

router.post('/login',
    ValidationMiddleware.validate(validationSchemas.recruiterLogin),
    authController.login
);

// Password reset routes (public)
router.post('/forgot-password',
    ValidationMiddleware.validate(validationSchemas.forgotPassword),
    authController.forgotPassword
);

router.post('/reset-password',
    ValidationMiddleware.validate(validationSchemas.resetPassword),
    authController.resetPassword
);

// Email verification routes (public)
router.post('/verify-email',
    ValidationMiddleware.validate(validationSchemas.verifyEmail),
    authController.verifyEmail
);

router.post('/resend-verification',
    ValidationMiddleware.validate(validationSchemas.resendVerification),
    authController.resendVerification
);

// Protected routes (require authentication)
router.use(AuthMiddleware.authenticate);

// User profile routes
router.get('/me', authController.me);
router.post('/logout', authController.logout);

// Recruiter-specific routes (require recruiter role)
router.use(AuthMiddleware.authenticate);

// Recruiter management routes
router.get('/', authController.getAllRecruiters);
router.get('/:id', authController.getRecruiterById);
router.get('/:id/stats', authController.getRecruiterStats);

router.put('/:id',
    ValidationMiddleware.validate(validationSchemas.updateRecruiter),
    authController.updateRecruiter
);

router.delete('/:id', authController.deleteRecruiter);

// Password management
router.post('/change-password', authController.changePassword);

export default router; 