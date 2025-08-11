import { Router } from 'express';
import { InterviewController } from '../controllers/interview.controller';
import { InterviewService } from '../services/interview.service';
import { PrismaClient } from '@prisma/client';
import { AuthMiddleware } from '../middlewares/auth.middleware';

const router = Router();
const prisma = new PrismaClient();
const interviewService = new InterviewService(prisma);
const interviewController = new InterviewController(interviewService);

// Apply auth middleware to all routes
router.use(AuthMiddleware.authenticate);

// Basic Interview CRUD operations
router.post('/', interviewController.createInterview.bind(interviewController));
router.get('/:id', interviewController.getInterviewById.bind(interviewController));
router.put('/:id', interviewController.updateInterview.bind(interviewController));
router.delete('/:id', interviewController.deleteInterview.bind(interviewController));

// Interview management
router.get('/recruiter/interviews', interviewController.getRecruiterInterviews.bind(interviewController));
router.get('/candidate/interviews', interviewController.getCandidateInterviews.bind(interviewController));

// Interview lifecycle
router.post('/:id/start', interviewController.startInterview.bind(interviewController));
router.post('/:id/end', interviewController.endInterview.bind(interviewController));
router.post('/:id/cancel', interviewController.cancelInterview.bind(interviewController));

// Interview statistics
router.get('/stats/recruiter', interviewController.getInterviewStats.bind(interviewController));

// Interview Questions and Code Submission
router.get('/:interviewId/questions', interviewController.getInterviewQuestions.bind(interviewController));
router.post('/run-code', interviewController.runCode.bind(interviewController));
router.post('/submit-code', interviewController.submitCode.bind(interviewController));
router.get('/:interviewId/submissions', interviewController.getInterviewSubmissions.bind(interviewController));
router.get('/questions/:questionId/submissions', interviewController.getUserSubmissions.bind(interviewController));
router.post('/:interviewId/assign-questions', interviewController.assignQuestionsToInterview.bind(interviewController));

// Legacy Coding Interview Endpoints (for backward compatibility)
router.post('/coding/questions', interviewController.createCodingQuestion.bind(interviewController));
router.get('/:interviewId/coding/questions', interviewController.getCodingQuestions.bind(interviewController));

export default router; 