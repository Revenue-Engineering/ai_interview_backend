// Zod validation schemas for the recruitment platform
// Following the validation best practices with comprehensive input validation

import { z } from 'zod';
import { getCurrentUTC } from '../utils/datetime';

// Define constants locally to avoid circular dependencies
const JOB_TYPES = ['full-time', 'part-time', 'contract', 'internship'] as const;
const EXPERIENCE_LEVELS = ['entry', 'mid', 'senior', 'lead'] as const;
const APPLICATION_STATUSES = ['applied', 'reviewing', 'interviewed', 'offered', 'rejected', 'withdrawn'] as const;
const INTERVIEW_TYPES = ['phone', 'video', 'onsite', 'technical', 'behavioral'] as const;
const INTERVIEW_STATUSES = ['scheduled', 'completed', 'cancelled', 'no-show'] as const;
const INTERVIEW_OUTCOMES = ['pass', 'fail', 'conditional', 'pending'] as const;

// Base validation schemas
export const emailSchema = z.string().email('Invalid email format');
export const passwordSchema = z.string().min(8, 'Password must be at least 8 characters');
export const phoneSchema = z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format').optional();

// Organization validation schemas
export const createOrganizationSchema = z.object({
    name: z.string().min(1, 'Organization name is required').max(255, 'Name too long'),
    description: z.string().max(1000, 'Description too long').optional(),
    website: z.string().url('Invalid website URL').optional(),
    industry: z.string().max(100, 'Industry name too long').optional(),
    size: z.string().max(50, 'Size description too long').optional(),
    location: z.string().max(255, 'Location too long').optional(),
});

export const updateOrganizationSchema = createOrganizationSchema.partial();

// Recruiter validation schemas
export const createRecruiterSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
    firstName: z.string().min(1, 'First name is required').max(100, 'First name too long'),
    lastName: z.string().min(1, 'Last name is required').max(100, 'Last name too long'),
    phone: phoneSchema,
    userType: z.enum(['recruiter', 'candidate', 'user'], { errorMap: () => ({ message: 'Invalid user type' }) }),
    title: z.string().max(100, 'Title too long').optional(),
    organizationId: z.string().cuid('Invalid organization ID').optional(),
    organization: createOrganizationSchema.optional(),
}).refine(
    (data) => data.organizationId || data.organization,
    { message: 'Either organizationId or organization data must be provided' }
);

export const updateRecruiterSchema = z.object({
    firstName: z.string().min(1, 'First name is required').max(100, 'First name too long').optional(),
    lastName: z.string().min(1, 'Last name is required').max(100, 'Last name too long').optional(),
    phone: phoneSchema,
    userType: z.enum(['recruiter', 'candidate', 'user'], { errorMap: () => ({ message: 'Invalid user type' }) }),
    title: z.string().max(100, 'Title too long').optional(),
    isActive: z.boolean().optional(),
});

export const recruiterLoginSchema = z.object({
    email: emailSchema,
    password: z.string().min(1, 'Password is required'),
});

// Candidate validation schemas
export const candidateDetailsSchema = z.object({
    phoneNumber: phoneSchema,
    location: z.string().max(255, 'Location too long').optional(),
    skills: z.string().max(1000, 'Skills description too long').optional(),
    education: z.string().max(1000, 'Education description too long').optional(),
    experience: z.string().max(1000, 'Experience description too long').optional(),
    resumeUrl: z.string().url('Invalid resume URL').optional(),
    portfolioUrl: z.string().url('Invalid portfolio URL').optional(),
    linkedInUrl: z.string().url('Invalid LinkedIn URL').optional(),
    githubUrl: z.string().url('Invalid GitHub URL').optional(),
    desiredJobTitle: z.string().max(100, 'Desired job title too long').optional(),
    preferredWorkLocation: z.string().max(100, 'Preferred work location too long').optional(),
    salaryExpectation: z.number().min(0, 'Salary expectation cannot be negative').optional(),
    noticePeriod: z.string().max(50, 'Notice period too long').optional(),
    workAuthorization: z.string().max(100, 'Work authorization too long').optional(),
    linkedInProfile: z.string().max(255, 'LinkedIn profile too long').optional(),
    preferredJobType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN']).optional(),
    languagesSpoken: z.string().max(500, 'Languages description too long').optional(),
});

export const createCandidateSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
    firstName: z.string().min(1, 'First name is required').max(100, 'First name too long'),
    lastName: z.string().min(1, 'Last name is required').max(100, 'Last name too long'),
    candidateDetails: candidateDetailsSchema,
});

export const updateCandidateSchema = z.object({
    firstName: z.string().min(1, 'First name is required').max(100, 'First name too long').optional(),
    lastName: z.string().min(1, 'Last name is required').max(100, 'Last name too long').optional(),
    candidateDetails: candidateDetailsSchema.partial().optional(),
});

export const candidateLoginSchema = z.object({
    email: emailSchema,
    password: z.string().min(1, 'Password is required'),
});

// Job Post validation schemas
export const createJobPostSchema = z.object({
    name: z.string().min(1, 'Job name is required').max(255, 'Job name too long'),
    numberOfOpenings: z.number().int().min(1, 'Number of openings must be at least 1'),
    minimumExperience: z.number().int().min(0, 'Minimum experience cannot be negative'),
    maximumExperience: z.number().int().min(0, 'Maximum experience cannot be negative'),
    minAnnualSalary: z.number().int().min(0, 'Minimum annual salary cannot be negative'),
    maxAnnualSalary: z.number().int().min(0, 'Maximum annual salary cannot be negative'),
    jobSkill: z.string().min(1, 'Job skills are required').max(2000, 'Job skills too long'),
    jobCategory: z.string().min(1, 'Job category is required').max(100, 'Job category too long'),
    city: z.string().max(100, 'City name too long').optional(),
    locality: z.string().max(100, 'Locality too long').optional(),
    country: z.string().max(100, 'Country name too long').optional(),
    state: z.string().max(100, 'State name too long').optional(),
    address: z.string().max(1000, 'Address too long').optional(),
    enableJobApplicationForm: z.boolean().default(false),
    specialization: z.string().max(100, 'Specialization too long').optional(),
    jobDescriptionText: z.string().max(5000, 'Job description too long').optional(),
    currencyId: z.number().int().min(1, 'Currency ID must be at least 1'),
    salaryType: z.string().min(1, 'Salary type is required').max(50, 'Salary type too long'),
    jobPostingStatus: z.string().min(1, 'Job posting status is required').max(50, 'Job posting status too long'),
    applicationFormUrl: z.string().url('Invalid application form URL').optional(),
    sharedJobImage: z.string().url('Invalid job image URL').optional(),
}).refine(
    (data) => data.minimumExperience <= data.maximumExperience,
    { message: 'Minimum experience cannot be greater than maximum experience' }
).refine(
    (data) => data.minAnnualSalary <= data.maxAnnualSalary,
    { message: 'Minimum annual salary cannot be greater than maximum annual salary' }
);

export const updateJobPostSchema = z.object({
    name: z.string().min(1, 'Job name is required').max(255, 'Job name too long').optional(),
    numberOfOpenings: z.number().int().min(1, 'Number of openings must be at least 1').optional(),
    minimumExperience: z.number().int().min(0, 'Minimum experience cannot be negative').optional(),
    maximumExperience: z.number().int().min(0, 'Maximum experience cannot be negative').optional(),
    minAnnualSalary: z.number().int().min(0, 'Minimum annual salary cannot be negative').optional(),
    maxAnnualSalary: z.number().int().min(0, 'Maximum annual salary cannot be negative').optional(),
    jobSkill: z.string().min(1, 'Job skills are required').max(2000, 'Job skills too long').optional(),
    jobCategory: z.string().min(1, 'Job category is required').max(100, 'Job category too long').optional(),
    city: z.string().max(100, 'City name too long').optional(),
    locality: z.string().max(100, 'Locality too long').optional(),
    country: z.string().max(100, 'Country name too long').optional(),
    state: z.string().max(100, 'State name too long').optional(),
    address: z.string().max(1000, 'Address too long').optional(),
    enableJobApplicationForm: z.boolean().optional(),
    specialization: z.string().max(100, 'Specialization too long').optional(),
    jobDescriptionText: z.string().max(5000, 'Job description too long').optional(),
    currencyId: z.number().int().min(1, 'Currency ID must be at least 1').optional(),
    salaryType: z.string().min(1, 'Salary type is required').max(50, 'Salary type too long').optional(),
    jobPostingStatus: z.string().min(1, 'Job posting status is required').max(50, 'Job posting status too long').optional(),
    applicationFormUrl: z.string().url('Invalid application form URL').optional(),
    sharedJobImage: z.string().url('Invalid job image URL').optional(),
}).refine(
    (data) => {
        if (data.minimumExperience !== undefined && data.maximumExperience !== undefined) {
            return data.minimumExperience <= data.maximumExperience;
        }
        return true;
    },
    { message: 'Minimum experience cannot be greater than maximum experience' }
).refine(
    (data) => {
        if (data.minAnnualSalary !== undefined && data.maxAnnualSalary !== undefined) {
            return data.minAnnualSalary <= data.maxAnnualSalary;
        }
        return true;
    },
    { message: 'Minimum annual salary cannot be greater than maximum annual salary' }
);

// Authentication validation schemas
export const forgotPasswordSchema = z.object({
    email: emailSchema,
});

export const resetPasswordSchema = z.object({
    token: z.string().min(1, 'Token is required'),
    password: passwordSchema,
});

export const verifyEmailSchema = z.object({
    token: z.string().min(1, 'Token is required'),
});

export const resendVerificationSchema = z.object({
    email: emailSchema,
});

// Job validation schemas
const jobSchemaBase = z.object({
    title: z.string().min(1, 'Job title is required').max(255, 'Title too long'),
    description: z.string().min(10, 'Description must be at least 10 characters').max(5000, 'Description too long'),
    requirements: z.string().min(10, 'Requirements must be at least 10 characters').max(5000, 'Requirements too long'),
    responsibilities: z.string().min(10, 'Responsibilities must be at least 10 characters').max(5000, 'Responsibilities too long'),
    salaryMin: z.number().int().min(0, 'Minimum salary cannot be negative').optional(),
    salaryMax: z.number().int().min(0, 'Maximum salary cannot be negative').optional(),
    salaryCurrency: z.string().length(3, 'Currency must be 3 characters').default('USD'),
    location: z.string().max(255, 'Location too long').optional(),
    isRemote: z.boolean().default(false),
    jobType: z.enum(JOB_TYPES, { errorMap: () => ({ message: 'Invalid job type' }) }),
    experienceLevel: z.enum(EXPERIENCE_LEVELS, { errorMap: () => ({ message: 'Invalid experience level' }) }),
    skills: z.array(z.string().min(1, 'Skill cannot be empty')).min(1, 'At least one skill is required'),
    expiresAt: z.date().optional(),
});

export const createJobSchema = jobSchemaBase.refine(
    (data) => !data.salaryMin || !data.salaryMax || data.salaryMin <= data.salaryMax,
    { message: 'Minimum salary cannot be greater than maximum salary' }
);

export const updateJobSchema = jobSchemaBase.partial().extend({
    isActive: z.boolean().optional(),
});

// Application validation schemas
export const csvCandidateDataSchema = z.object({
    email: emailSchema,
    firstName: z.string().max(100, 'First name too long').optional(),
    lastName: z.string().max(100, 'Last name too long').optional(),
    phoneNumber: phoneSchema.optional(),
    location: z.string().max(255, 'Location too long').optional(),
    skills: z.string().max(1000, 'Skills description too long').optional(),
    education: z.string().max(1000, 'Education description too long').optional(),
    experience: z.string().max(1000, 'Experience description too long').optional(),
    resumeUrl: z.string().url('Invalid resume URL').optional(),
    portfolioUrl: z.string().url('Invalid portfolio URL').optional(),
    linkedInUrl: z.string().url('Invalid LinkedIn URL').optional(),
    githubUrl: z.string().url('Invalid GitHub URL').optional(),
    desiredJobTitle: z.string().max(100, 'Desired job title too long').optional(),
    preferredWorkLocation: z.string().max(100, 'Preferred work location too long').optional(),
    salaryExpectation: z.number().min(0, 'Salary expectation cannot be negative').optional(),
    noticePeriod: z.string().max(50, 'Notice period too long').optional(),
    workAuthorization: z.string().max(100, 'Work authorization too long').optional(),
    linkedInProfile: z.string().max(255, 'LinkedIn profile too long').optional(),
    preferredJobType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN']).optional(),
    languagesSpoken: z.string().max(500, 'Languages description too long').optional(),
});

export const createApplicationSchema = z.object({
    jobId: z.number().int().min(1, 'Job ID must be a positive integer'),
    candidateEmails: z.array(emailSchema).min(1, 'At least one candidate email is required').max(100, 'Maximum 100 candidates allowed'),
    candidateDetails: z.array(csvCandidateDataSchema).optional(),
    notes: z.string().max(1000, 'Notes too long').optional(),
    autoCreateInterview: z.object({
        scheduledAt: z.date().min(getCurrentUTC(), 'Interview cannot be scheduled in the past'),
        mode: z.enum(['live', 'async'], { errorMap: () => ({ message: 'Invalid interview mode' }) }),
        durationMinutes: z.number().int().min(15, 'Duration must be at least 15 minutes').max(480, 'Duration cannot exceed 8 hours').default(60),
        timezone: z.string().max(50, 'Timezone too long').default('UTC'),
        notes: z.string().max(1000, 'Notes too long').optional(),
    }).optional(),
});

export const updateApplicationSchema = z.object({
    status: z.enum(['PENDING', 'REVIEWING', 'SHORTLISTED', 'REJECTED', 'HIRED', 'WITHDRAWN']).optional(),
    reviewDate: z.date().optional(),
    notes: z.string().max(1000, 'Notes too long').optional(),
    isInvited: z.boolean().optional(),
    invitedAt: z.date().optional(),
    applicationUrl: z.string().url('Invalid application URL').optional(),
});

// Interview Session validation schemas
export const createInterviewSessionSchema = z.object({
    scheduledAt: z.date().min(getCurrentUTC(), 'Interview cannot be scheduled in the past'),
    duration: z.number().int().min(15, 'Duration must be at least 15 minutes').max(480, 'Duration cannot exceed 8 hours').default(60),
    type: z.enum(INTERVIEW_TYPES, { errorMap: () => ({ message: 'Invalid interview type' }) }),
    notes: z.string().max(1000, 'Notes too long').optional(),
    applicationId: z.string().cuid('Invalid application ID'),
});

export const updateInterviewSessionSchema = z.object({
    scheduledAt: z.date().min(getCurrentUTC(), 'Interview cannot be scheduled in the past').optional(),
    duration: z.number().int().min(15, 'Duration must be at least 15 minutes').max(480, 'Duration cannot exceed 8 hours').optional(),
    type: z.enum(INTERVIEW_TYPES, { errorMap: () => ({ message: 'Invalid interview type' }) }).optional(),
    status: z.enum(INTERVIEW_STATUSES, { errorMap: () => ({ message: 'Invalid interview status' }) }).optional(),
    notes: z.string().max(1000, 'Notes too long').optional(),
});

// Interview Metadata validation schemas
export const createInterviewMetadataSchema = z.object({
    conversationHistory: z.record(z.any()).or(z.array(z.any())),
    candidateResponses: z.record(z.any()).or(z.array(z.any())),
    performanceMetrics: z.record(z.any()).or(z.array(z.any())),
    technicalScore: z.number().min(0, 'Score cannot be negative').max(100, 'Score cannot exceed 100').optional(),
    communicationScore: z.number().min(0, 'Score cannot be negative').max(100, 'Score cannot exceed 100').optional(),
    problemSolvingScore: z.number().min(0, 'Score cannot be negative').max(100, 'Score cannot exceed 100').optional(),
    overallScore: z.number().min(0, 'Score cannot be negative').max(100, 'Score cannot exceed 100').optional(),
    aiAnalysis: z.string().max(5000, 'AI analysis too long').optional(),
});

export const updateInterviewMetadataSchema = createInterviewMetadataSchema.partial();

// Interview Result validation schemas
export const createInterviewResultSchema = z.object({
    outcome: z.enum(INTERVIEW_OUTCOMES, { errorMap: () => ({ message: 'Invalid interview outcome' }) }),
    score: z.number().min(0, 'Score cannot be negative').max(100, 'Score cannot exceed 100').optional(),
    feedback: z.string().max(2000, 'Feedback too long').optional(),
    strengths: z.array(z.string().min(1, 'Strength cannot be empty')).min(1, 'At least one strength is required'),
    weaknesses: z.array(z.string().min(1, 'Weakness cannot be empty')).min(1, 'At least one weakness is required'),
    recommendations: z.string().max(1000, 'Recommendations too long').optional(),
    decisionNotes: z.string().max(1000, 'Decision notes too long').optional(),
});

export const updateInterviewResultSchema = createInterviewResultSchema.partial();

// Interview validation schemas
export const createInterviewSchema = z.object({
    applicationId: z.number().int().min(1, 'Application ID must be a positive integer'),
    scheduledAt: z.date().min(getCurrentUTC(), 'Interview cannot be scheduled in the past'),
    mode: z.enum(['live', 'async'], { errorMap: () => ({ message: 'Invalid interview mode' }) }),
    durationMinutes: z.number().int().min(15, 'Duration must be at least 15 minutes').max(480, 'Duration cannot exceed 8 hours').default(60),
    timezone: z.string().max(50, 'Timezone too long').default('UTC'),
    notes: z.string().max(1000, 'Notes too long').optional(),
});

export const updateInterviewSchema = z.object({
    scheduledAt: z.date().min(getCurrentUTC(), 'Interview cannot be scheduled in the past').optional(),
    mode: z.enum(['live', 'async'], { errorMap: () => ({ message: 'Invalid interview mode' }) }).optional(),
    status: z.enum(['scheduled', 'in_progress', 'completed', 'expired', 'cancelled'], { errorMap: () => ({ message: 'Invalid interview status' }) }).optional(),
    durationMinutes: z.number().int().min(15, 'Duration must be at least 15 minutes').max(480, 'Duration cannot exceed 8 hours').optional(),
    timezone: z.string().max(50, 'Timezone too long').optional(),
    aiScore: z.number().min(0, 'Score cannot be negative').max(100, 'Score cannot exceed 100').optional(),
    aiFeedbackSummary: z.string().max(5000, 'Feedback summary too long').optional(),
    plagiarismFlagged: z.boolean().optional(),
    integrityFlags: z.record(z.any()).optional(),
});

export const startInterviewSchema = z.object({
    interviewId: z.number().int().min(1, 'Interview ID must be a positive integer'),
});

export const endInterviewSchema = z.object({
    interviewId: z.number().int().min(1, 'Interview ID must be a positive integer'),
    aiScore: z.number().min(0, 'Score cannot be negative').max(100, 'Score cannot exceed 100').optional(),
    aiFeedbackSummary: z.string().max(5000, 'Feedback summary too long').optional(),
    plagiarismFlagged: z.boolean().optional(),
    integrityFlags: z.record(z.any()).optional(),
});

// Candidate interview schemas
export const candidateInterviewSchema = z.object({
    interviewId: z.number().int().min(1, 'Interview ID must be a positive integer'),
});

// Pagination validation schemas
export const paginationSchema = z.object({
    page: z.number().int().min(1, 'Page must be at least 1').default(1),
    limit: z.number().int().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100').default(10),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Filter validation schemas
export const jobFiltersSchema = z.object({
    title: z.string().optional(),
    location: z.string().optional(),
    jobType: z.enum(JOB_TYPES).optional(),
    experienceLevel: z.enum(EXPERIENCE_LEVELS).optional(),
    skills: z.array(z.string()).optional(),
    isRemote: z.boolean().optional(),
    isActive: z.boolean().optional(),
    organizationId: z.string().cuid().optional(),
    recruiterId: z.string().cuid().optional(),
});

export const applicationFiltersSchema = z.object({
    status: z.enum(APPLICATION_STATUSES).optional(),
    candidateId: z.string().cuid().optional(),
    jobId: z.string().cuid().optional(),
    appliedAfter: z.date().optional(),
    appliedBefore: z.date().optional(),
});

// ID validation schemas
export const idParamSchema = z.object({
    id: z.string().cuid('Invalid ID format'),
});

export const interviewIdParamSchema = z.object({
    id: z.string().cuid('Invalid interview ID format'),
});

// Bulk assignment validation schema
export const bulkAssignCandidatesSchema = z.object({
    jobId: z.number().int().positive('Job ID must be a positive integer'),
    csv: z.array(z.object({
        email: z.string().email('Invalid email format'),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        phone: z.string().optional(),
        location: z.string().optional(),
        skills: z.string().optional(),
        experience: z.string().optional(),
        education: z.string().optional(),
        resumeUrl: z.string().url('Invalid resume URL').optional(),
        linkedInUrl: z.string().url('Invalid LinkedIn URL').optional(),
        githubUrl: z.string().url('Invalid GitHub URL').optional(),
        portfolioUrl: z.string().url('Invalid portfolio URL').optional(),
        desiredJobTitle: z.string().optional(),
        preferredWorkLocation: z.string().optional(),
        salaryExpectation: z.number().positive('Salary expectation must be positive').optional(),
        noticePeriod: z.string().optional(),
        workAuthorization: z.string().optional(),
        preferredJobType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN']).optional(),
        languagesSpoken: z.string().optional(),
    })).min(1, 'At least one candidate is required'),
    numberOfDays: z.number().int().min(1, 'Number of days must be at least 1').max(365, 'Number of days cannot exceed 365'),
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:mm format'),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:mm format'),
    interviewType: z.enum(['coding', 'technical', 'behavioral', 'system_design', 'case_study'], {
        errorMap: () => ({ message: 'Invalid interview type' })
    }),
    durationMinutes: z.number().int().min(1, 'Duration must be at least 1 minute').max(480, 'Duration cannot exceed 480 minutes (8 hours)'),
    notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional(),
}).refine(
    (data) => {
        // Validate that end time is after start time
        const startMinutes = parseInt(data.startTime.split(':')[0]) * 60 + parseInt(data.startTime.split(':')[1]);
        const endMinutes = parseInt(data.endTime.split(':')[0]) * 60 + parseInt(data.endTime.split(':')[1]);
        return endMinutes > startMinutes;
    },
    {
        message: 'End time must be after start time',
        path: ['endTime']
    }
);

// Export all schemas for use in routes and controllers
export const validationSchemas = {
    // Organization
    createOrganization: createOrganizationSchema,
    updateOrganization: updateOrganizationSchema,

    // Recruiter
    createRecruiter: createRecruiterSchema,
    updateRecruiter: updateRecruiterSchema,
    recruiterLogin: recruiterLoginSchema,

    // Candidate
    createCandidate: createCandidateSchema,
    updateCandidate: updateCandidateSchema,
    candidateLogin: candidateLoginSchema,
    candidateDetails: candidateDetailsSchema,

    // Job Post
    createJobPost: createJobPostSchema,
    updateJobPost: updateJobPostSchema,

    // Authentication
    forgotPassword: forgotPasswordSchema,
    resetPassword: resetPasswordSchema,
    verifyEmail: verifyEmailSchema,
    resendVerification: resendVerificationSchema,

    // Job
    createJob: createJobSchema,
    updateJob: updateJobSchema,

    // Application
    createApplication: createApplicationSchema,
    updateApplication: updateApplicationSchema,
    csvCandidateData: csvCandidateDataSchema,

    // Interview Session
    createInterviewSession: createInterviewSessionSchema,
    updateInterviewSession: updateInterviewSessionSchema,

    // Interview Metadata
    createInterviewMetadata: createInterviewMetadataSchema,
    updateInterviewMetadata: updateInterviewMetadataSchema,

    // Interview Result
    createInterviewResult: createInterviewResultSchema,
    updateInterviewResult: updateInterviewResultSchema,

    // Interview
    createInterview: createInterviewSchema,
    updateInterview: updateInterviewSchema,
    startInterview: startInterviewSchema,
    endInterview: endInterviewSchema,
    candidateInterview: candidateInterviewSchema,

    // Bulk Assignment
    bulkAssignCandidates: bulkAssignCandidatesSchema,

    // Pagination and Filters
    pagination: paginationSchema,
    jobFilters: jobFiltersSchema,
    applicationFilters: applicationFiltersSchema,

    // Params
    idParam: idParamSchema,
    interviewIdParam: interviewIdParamSchema,
}; 