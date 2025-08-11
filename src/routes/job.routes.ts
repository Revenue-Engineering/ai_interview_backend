import { Router } from 'express';
import { JobController } from '../controllers/job.controller';
import { ValidationMiddleware } from '../middlewares/validation.middleware';
import { AuthMiddleware } from '../middlewares/auth.middleware';
import { validationSchemas } from '../types/validation';

const router = Router();
const jobController = new JobController();

// Public routes (no authentication required)
router.get('/', jobController.getAllJobPosts);
router.get('/search', jobController.searchJobPosts);
router.get('/:id', jobController.getJobPostById);
router.get('/slug/:slug', jobController.getJobPostBySlug);
router.get('/organizations/:organizationId', jobController.getJobPostsByOrganization);

// Protected routes (authentication required)
router.use(AuthMiddleware.authenticate);

// Job management routes (recruiter only)
router.post(
    '/',
    ValidationMiddleware.validate(validationSchemas.createJobPost),
    jobController.createJobPost
);

router.put(
    '/:id',
    ValidationMiddleware.validate(validationSchemas.updateJobPost),
    jobController.updateJobPost
);

router.delete('/:id', jobController.deleteJobPost);

// User-specific routes
router.get('/user/jobs', jobController.getJobPostsByUser);
router.get('/user/jobs/stats', jobController.getJobPostStats);

// Organization-specific routes (for authenticated users)
router.get('/organization/jobs', jobController.getJobPostsByUserOrganization);


export default router; 