import multer from "multer";
import { Router } from 'express';
import { ApplicationController } from '../controllers/application.controller';
import { ApplicationService } from '../services/application.service';
import { EmailService } from '../services/email.service';
import { AuthService } from '../services/auth.service';
import { ValidationMiddleware } from '../middlewares/validation.middleware';
import { AuthMiddleware } from '../middlewares/auth.middleware';
import { validationSchemas } from '../types/validation';
import { prisma } from '../utils/database';
import { OrganizationService } from '../services/organization.service';

const router = Router();

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
            cb(null, true);
        } else {
            cb(new Error("Only CSV files are allowed"));
        }
    }
});

// Initialize services
const emailService = new EmailService();
const authService = new AuthService(prisma, new OrganizationService(prisma));
const applicationService = new ApplicationService(prisma, emailService, authService);
const applicationController = new ApplicationController(applicationService);

// Protected routes - require authentication
router.use(AuthMiddleware.authenticate);

// Create bulk applications for candidates (JSON data)
router.post(
    "/bulk",
    ValidationMiddleware.validate(validationSchemas.createApplication),
    applicationController.createBulkApplications.bind(applicationController)
);

// Create bulk applications for candidates (CSV file upload)
router.post(
    "/bulk/csv",
    upload.single("csvFile"),
    applicationController.createBulkApplicationsFromCSV.bind(applicationController)
);

// Get applications by job ID
router.get('/job/:jobId', applicationController.getApplicationsByJob.bind(applicationController));

// Get all applications for the authenticated recruiter
router.get('/recruiter', applicationController.getRecruiterApplications.bind(applicationController));

// Get application statistics
router.get('/stats', applicationController.getApplicationStats.bind(applicationController));

// Get application by ID
router.get('/application/:id', applicationController.getApplicationById.bind(applicationController));

// Get organization applications
router.get('/organization', applicationController.getOrganizationApplications.bind(applicationController));

// Update application status
router.put(
    '/:id/status',
    ValidationMiddleware.validate(validationSchemas.updateApplication),
    applicationController.updateApplicationStatus.bind(applicationController)
);

// Delete application
router.delete('/:id', applicationController.deleteApplication.bind(applicationController));

export default router;
