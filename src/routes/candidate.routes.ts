import { Router } from 'express';
import { CandidateController } from '../controllers/candidate.controller';
import { CandidateService } from '../services/candidate.service';
import { ValidationMiddleware } from '../middlewares/validation.middleware';
import { AuthMiddleware } from '../middlewares/auth.middleware';
import { validationSchemas } from '../types/validation';
import { prisma } from '../utils/database';

const router = Router();

// Initialize services
const candidateService = new CandidateService(prisma);
const candidateController = new CandidateController(candidateService);

// Protected routes - require authentication
router.use(AuthMiddleware.authenticate);

// ===== CANDIDATE ENDPOINTS =====

// Get candidate's own applications
router.get('/applications', candidateController.getMyApplications.bind(candidateController));

// Get specific application with job and organization details
router.get('/applications/:id', candidateController.getMyApplicationById.bind(candidateController));

// Get application statistics
router.get('/applications/stats', candidateController.getMyApplicationStats.bind(candidateController));

// Get candidate's interviews
router.get('/interviews', candidateController.getMyInterviews.bind(candidateController));

// Get specific interview details
router.get('/interviews/:id', candidateController.getMyInterviewById.bind(candidateController));

// Get candidate profile
router.get('/profile', candidateController.getMyProfile.bind(candidateController));

// Update candidate profile
router.put(
  '/profile',
  ValidationMiddleware.validate(validationSchemas.updateCandidate),
  candidateController.updateMyProfile.bind(candidateController)
);

// Get job details
router.get('/jobs/:jobId', candidateController.getJobDetails.bind(candidateController));

// Get organization details
router.get('/organizations/:organizationId', candidateController.getOrganizationDetails.bind(candidateController));



export default router; 