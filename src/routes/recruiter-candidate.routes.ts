import { Router } from 'express';
import { RecruiterCandidateController } from '../controllers/recruiter-candidate.controller';
import { RecruiterCandidateService } from '../services/recruiter-candidate.service';
import { ValidationMiddleware } from '../middlewares/validation.middleware';
import { AuthMiddleware } from '../middlewares/auth.middleware';
import { validationSchemas } from '../types/validation';
import { prisma } from '../utils/database';

const router = Router();

// Initialize services
const recruiterCandidateService = new RecruiterCandidateService(prisma);
const recruiterCandidateController = new RecruiterCandidateController(recruiterCandidateService);

// Protected routes - require authentication and recruiter role
router.use(AuthMiddleware.authenticate);
// router.use(AuthMiddleware.requireRecruiter);

// ===== RECRUITER CANDIDATE ENDPOINTS =====

// Get candidate details by email (recruiter access)
router.get('/by-email/:email', recruiterCandidateController.getCandidateByEmail.bind(recruiterCandidateController));

// Get candidate details with applications by email (recruiter access)
router.get('/by-email/:email/with-applications', recruiterCandidateController.getCandidateWithApplicationsByEmail.bind(recruiterCandidateController));

// Get candidate details with applications (recruiter access)
router.get('/:candidateId/applications', recruiterCandidateController.getCandidateWithApplications.bind(recruiterCandidateController));

// Get Candidate Application Details By Id
router.get('/application/:applicationId', recruiterCandidateController.getCandidateApplicationById.bind(recruiterCandidateController));

// Bulk assign candidates to interviews with scheduling
router.post('/bulk-assign',
    ValidationMiddleware.validate(validationSchemas.bulkAssignCandidates),
    recruiterCandidateController.bulkAssignCandidates.bind(recruiterCandidateController)
);

export default router;
