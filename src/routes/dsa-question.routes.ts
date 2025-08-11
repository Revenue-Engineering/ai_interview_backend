import { Router } from 'express';
import { DsaQuestionController } from '../controllers/dsa-question.controller';
import { PrismaClient } from '@prisma/client';
import { AuthMiddleware } from '../middlewares/auth.middleware';
import multer from 'multer';
import path from 'path';

const router = Router();
const prisma = new PrismaClient();
const dsaQuestionController = new DsaQuestionController(prisma);

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed'));
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Apply auth middleware to all routes
router.use(AuthMiddleware.authenticate);

// DSA Questions CRUD operations
router.post('/', dsaQuestionController.createDsaQuestion.bind(dsaQuestionController));
router.get('/', dsaQuestionController.getDsaQuestions.bind(dsaQuestionController));
router.get('/stats', dsaQuestionController.getDsaQuestionStats.bind(dsaQuestionController));
router.get('/:id', dsaQuestionController.getDsaQuestionById.bind(dsaQuestionController));
router.put('/:id', dsaQuestionController.updateDsaQuestion.bind(dsaQuestionController));
router.delete('/:id', dsaQuestionController.deleteDsaQuestion.bind(dsaQuestionController));

// Random questions and interview assignment
router.get('/random/questions', dsaQuestionController.getRandomQuestions.bind(dsaQuestionController));
router.get('/interviews/:interviewId/questions', dsaQuestionController.getInterviewQuestions.bind(dsaQuestionController));
router.post('/interviews/:interviewId/assign', dsaQuestionController.assignQuestionsToInterview.bind(dsaQuestionController));

// Bulk upload functionality
router.post('/bulk-upload', upload.single('csvFile'), dsaQuestionController.bulkUploadFromCsv.bind(dsaQuestionController));
router.get('/template/download', dsaQuestionController.downloadCsvTemplate.bind(dsaQuestionController));

export default router; 