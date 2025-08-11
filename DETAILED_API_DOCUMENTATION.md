# Detailed API Documentation

## Table of Contents
1. [Authentication](#authentication)
2. [Jobs](#jobs)
3. [Applications](#applications)
4. [Interviews](#interviews)
5. [Candidates](#candidates)
6. [Error Handling](#error-handling)

## Base Information

**Base URL:** `http://localhost:8000/api/v1`

**Authentication:** Bearer Token (JWT)
```
Authorization: Bearer <your_jwt_token>
```

## Authentication

### 1. User Registration
**POST** `/auth/signup`

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "userType": "RECRUITER",
  "organization": {
    "name": "Tech Corp",
    "description": "Leading technology company",
    "website": "https://techcorp.com",
    "industry": "Technology",
    "size": "100-500",
    "location": "San Francisco, CA"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "1",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "userType": "RECRUITER"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 2. User Login
**POST** `/auth/login`

Authenticate user and get access token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "1",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "userType": "RECRUITER"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

## Jobs

### 1. Create Job Posting
**POST** `/jobs`

Create a new job posting.

**Request Body:**
```json
{
  "name": "Senior Software Engineer",
  "numberOfOpenings": 2,
  "minimumExperience": 3,
  "maximumExperience": 8,
  "minAnnualSalary": 80000,
  "maxAnnualSalary": 150000,
  "jobSkill": "JavaScript, React, Node.js, TypeScript",
  "jobCategory": "Software Development",
  "city": "San Francisco",
  "country": "USA",
  "jobDescriptionText": "We are looking for a senior software engineer...",
  "currencyId": 1,
  "salaryType": "annual",
  "jobPostingStatus": "active"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Job created successfully",
  "data": {
    "id": 1,
    "name": "Senior Software Engineer",
    "slug": "senior-software-engineer",
    "numberOfOpenings": 2,
    "minimumExperience": 3,
    "maximumExperience": 8,
    "minAnnualSalary": 80000,
    "maxAnnualSalary": 150000,
    "jobSkill": "JavaScript, React, Node.js, TypeScript",
    "jobCategory": "Software Development",
    "city": "San Francisco",
    "country": "USA",
    "jobDescriptionText": "We are looking for a senior software engineer...",
    "currencyId": 1,
    "salaryType": "annual",
    "jobPostingStatus": "active",
    "createdOn": "2024-01-15T10:00:00Z",
    "updatedOn": "2024-01-15T10:00:00Z"
  }
}
```

### 2. Get All Jobs
**GET** `/jobs`

Get all jobs with filtering and pagination.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)
- `sortBy` (optional): Sort field (default: createdOn)
- `sortOrder` (optional): Sort order - asc/desc (default: desc)
- `jobCategory` (optional): Filter by job category
- `city` (optional): Filter by city
- `jobPostingStatus` (optional): Filter by status

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "name": "Senior Software Engineer",
        "slug": "senior-software-engineer",
        "numberOfOpenings": 2,
        "minimumExperience": 3,
        "maximumExperience": 8,
        "minAnnualSalary": 80000,
        "maxAnnualSalary": 150000,
        "jobSkill": "JavaScript, React, Node.js, TypeScript",
        "jobCategory": "Software Development",
        "city": "San Francisco",
        "country": "USA",
        "jobDescriptionText": "We are looking for a senior software engineer...",
        "currencyId": 1,
        "salaryType": "annual",
        "jobPostingStatus": "active",
        "createdOn": "2024-01-15T10:00:00Z",
        "updatedOn": "2024-01-15T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

## Applications

### 1. Create Bulk Applications
**POST** `/applications/bulk`

Create applications for multiple candidates with optional auto-interview creation.

**Request Body:**
```json
{
  "jobId": 1,
  "candidateEmails": [
    "candidate1@example.com",
    "candidate2@example.com"
  ],
  "candidateDetails": [
    {
      "email": "candidate1@example.com",
      "firstName": "John",
      "lastName": "Smith",
      "phoneNumber": "+1234567890",
      "location": "New York, NY",
      "skills": "JavaScript, React, Node.js",
      "experience": "5 years of software development",
      "resumeUrl": "https://example.com/resume1.pdf"
    },
    {
      "email": "candidate2@example.com",
      "firstName": "Jane",
      "lastName": "Doe",
      "phoneNumber": "+1987654321",
      "location": "San Francisco, CA",
      "skills": "Python, Django, PostgreSQL",
      "experience": "3 years of backend development",
      "resumeUrl": "https://example.com/resume2.pdf"
    }
  ],
  "notes": "Candidates from LinkedIn recruitment campaign",
  "autoCreateInterview": {
    "scheduledAt": "2024-01-20T14:00:00Z",
    "mode": "live",
    "durationMinutes": 60,
    "timezone": "UTC",
    "notes": "DSA interview focusing on algorithms and data structures"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully created 2 applications with interviews",
  "data": {
    "created": 2,
    "failed": 0,
    "applications": [
      {
        "id": "1",
        "jobId": 1,
        "candidateId": "1",
        "recruiterId": "1",
        "organizationId": 1,
        "status": "PENDING",
        "applicationDate": "2024-01-15T10:00:00Z",
        "notes": "Candidates from LinkedIn recruitment campaign",
        "isInvited": false,
        "createdAt": "2024-01-15T10:00:00Z",
        "updatedAt": "2024-01-15T10:00:00Z"
      }
    ],
    "errors": []
  }
}
```

### 2. Get Applications by Job
**GET** `/applications/job/:jobId`

Get all applications for a specific job.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)
- `status` (optional): Filter by application status

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "1",
        "jobId": 1,
        "candidateId": "1",
        "recruiterId": "1",
        "organizationId": 1,
        "status": "PENDING",
        "applicationDate": "2024-01-15T10:00:00Z",
        "notes": "Candidates from LinkedIn recruitment campaign",
        "isInvited": false,
        "createdAt": "2024-01-15T10:00:00Z",
        "updatedAt": "2024-01-15T10:00:00Z",
        "candidate": {
          "id": "1",
          "firstName": "John",
          "lastName": "Smith",
          "email": "candidate1@example.com"
        },
        "job": {
          "id": 1,
          "name": "Senior Software Engineer",
          "jobCategory": "Software Development"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

### 3. Update Application Status
**PUT** `/applications/:id/status`

Update the status of an application.

**Request Body:**
```json
{
  "status": "SHORTLISTED",
  "notes": "Candidate has strong technical skills and relevant experience"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Application status updated successfully",
  "data": {
    "id": "1",
    "jobId": 1,
    "candidateId": "1",
    "recruiterId": "1",
    "organizationId": 1,
    "status": "SHORTLISTED",
    "applicationDate": "2024-01-15T10:00:00Z",
    "reviewDate": "2024-01-15T11:00:00Z",
    "notes": "Candidate has strong technical skills and relevant experience",
    "isInvited": false,
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T11:00:00Z"
  }
}
```

## Interviews

### 1. Create Interview
**POST** `/interviews`

Schedule an interview for a candidate.

**Request Body:**
```json
{
  "applicationId": 1,
  "scheduledAt": "2024-01-20T14:00:00Z",
  "mode": "live",
  "durationMinutes": 60,
  "timezone": "UTC",
  "notes": "DSA interview focusing on algorithms and data structures"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Interview created successfully",
  "data": {
    "id": "1",
    "applicationId": "1",
    "scheduledAt": "2024-01-20T14:00:00Z",
    "startedAt": null,
    "endedAt": null,
    "mode": "live",
    "status": "scheduled",
    "durationMinutes": 60,
    "timezone": "UTC",
    "createdBy": "1",
    "aiScore": null,
    "aiFeedbackSummary": null,
    "plagiarismFlagged": false,
    "integrityFlags": null,
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z"
  }
}
```

### 2. Get Recruiter Interviews
**GET** `/interviews/recruiter`

Get all interviews created by the authenticated recruiter.

**Query Parameters:**
- `status` (optional): Filter by interview status
- `mode` (optional): Filter by interview mode
- `applicationId` (optional): Filter by application ID

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "applicationId": "1",
      "scheduledAt": "2024-01-20T14:00:00Z",
      "startedAt": null,
      "endedAt": null,
      "mode": "live",
      "status": "scheduled",
      "durationMinutes": 60,
      "timezone": "UTC",
      "createdBy": "1",
      "aiScore": null,
      "aiFeedbackSummary": null,
      "plagiarismFlagged": false,
      "integrityFlags": null,
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-15T10:00:00Z",
      "application": {
        "id": "1",
        "jobId": 1,
        "candidateId": "1",
        "recruiterId": "1",
        "organizationId": 1,
        "status": "PENDING",
        "applicationDate": "2024-01-15T10:00:00Z",
        "candidate": {
          "id": "1",
          "firstName": "John",
          "lastName": "Smith",
          "email": "candidate1@example.com"
        },
        "job": {
          "id": 1,
          "name": "Senior Software Engineer",
          "organization": {
            "id": 1,
            "name": "Tech Corp",
            "industry": "Technology"
          }
        }
      }
    }
  ],
  "count": 1
}
```

### 3. Start Interview (Candidate)
**POST** `/interviews/:id/start`

Start an interview (candidate action).

**Path Parameters:**
- `id` (number): Interview ID

**Request Body:** None (interview ID is in the URL path)

**Response:**
```json
{
  "success": true,
  "message": "Interview started successfully",
  "data": {
    "id": "1",
    "applicationId": "1",
    "scheduledAt": "2024-01-20T14:00:00Z",
    "startedAt": "2024-01-20T14:00:00Z",
    "endedAt": null,
    "mode": "live",
    "status": "in_progress",
    "durationMinutes": 60,
    "timezone": "UTC",
    "createdBy": "1",
    "aiScore": null,
    "aiFeedbackSummary": null,
    "plagiarismFlagged": false,
    "integrityFlags": null,
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-20T14:00:00Z"
  }
}
```

### 4. End Interview with AI Results
**POST** `/interviews/:id/end`

End an interview and optionally provide AI assessment results.

**Path Parameters:**
- `id` (number): Interview ID

**Request Body:**
```json
{
  "aiScore": 85.5,
  "aiFeedbackSummary": "Strong problem-solving skills, good code quality, needs improvement in time complexity analysis",
  "plagiarismFlagged": false,
  "integrityFlags": {
    "tabSwitches": 2,
    "idleTime": 120,
    "copyPasteAttempts": 0
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Interview ended successfully",
  "data": {
    "id": "1",
    "applicationId": "1",
    "scheduledAt": "2024-01-20T14:00:00Z",
    "startedAt": "2024-01-20T14:00:00Z",
    "endedAt": "2024-01-20T15:00:00Z",
    "mode": "live",
    "status": "completed",
    "durationMinutes": 60,
    "timezone": "UTC",
    "createdBy": "1",
    "aiScore": 85.5,
    "aiFeedbackSummary": "Strong problem-solving skills, good code quality, needs improvement in time complexity analysis",
    "plagiarismFlagged": false,
    "integrityFlags": {
      "tabSwitches": 2,
      "idleTime": 120,
      "copyPasteAttempts": 0
    },
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-20T15:00:00Z"
  }
}
```

## Candidates

### 1. Get Candidate Applications
**GET** `/candidates/applications`

Get all applications for the authenticated candidate.

**Query Parameters:**
- `status` (optional): Filter by application status
- `jobId` (optional): Filter by job ID

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "jobId": 1,
      "candidateId": "1",
      "recruiterId": "1",
      "organizationId": 1,
      "status": "PENDING",
      "applicationDate": "2024-01-15T10:00:00Z",
      "notes": "Candidates from LinkedIn recruitment campaign",
      "isInvited": false,
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-15T10:00:00Z",
      "job": {
        "id": 1,
        "name": "Senior Software Engineer",
        "jobCategory": "Software Development",
        "organization": {
          "id": 1,
          "name": "Tech Corp",
          "industry": "Technology"
        }
      },
      "recruiter": {
        "id": "1",
        "firstName": "John",
        "lastName": "Doe",
        "email": "recruiter@techcorp.com"
      }
    }
  ],
  "count": 1
}
```

### 2. Get Application Details
**GET** `/candidates/applications/:id`

Get detailed information about a specific application including all associated interviews.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "1",
    "jobId": 1,
    "candidateId": "1",
    "recruiterId": "1",
    "organizationId": 1,
    "status": "PENDING",
    "applicationDate": "2024-01-15T10:00:00Z",
    "notes": "Candidates from LinkedIn recruitment campaign",
    "isInvited": false,
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z",
    "job": {
      "id": 1,
      "name": "Senior Software Engineer",
      "numberOfOpenings": 2,
      "minimumExperience": 3,
      "maximumExperience": 8,
      "minAnnualSalary": 80000,
      "maxAnnualSalary": 150000,
      "jobSkill": "JavaScript, React, Node.js, TypeScript",
      "jobCategory": "Software Development",
      "city": "San Francisco",
      "country": "USA",
      "jobDescriptionText": "We are looking for a senior software engineer...",
      "currencyId": 1,
      "salaryType": "annual",
      "jobPostingStatus": "active",
      "createdOn": "2024-01-15T10:00:00Z",
      "updatedOn": "2024-01-15T10:00:00Z",
      "organization": {
        "id": 1,
        "name": "Tech Corp",
        "description": "Leading technology company",
        "website": "https://techcorp.com",
        "industry": "Technology",
        "size": "100-500",
        "location": "San Francisco, CA"
      }
    },
    "recruiter": {
      "id": "1",
      "firstName": "John",
      "lastName": "Doe",
      "email": "recruiter@techcorp.com",
      "userType": "RECRUITER"
    },
    "interviews": [
      {
        "id": "1",
        "applicationId": "1",
        "scheduledAt": "2024-01-20T14:00:00Z",
        "startedAt": null,
        "endedAt": null,
        "mode": "live",
        "status": "scheduled",
        "durationMinutes": 60,
        "timezone": "UTC",
        "createdBy": "1",
        "aiScore": null,
        "aiFeedbackSummary": null,
        "plagiarismFlagged": false,
        "integrityFlags": null,
        "createdAt": "2024-01-15T10:00:00Z",
        "updatedAt": "2024-01-15T10:00:00Z",
        "creator": {
          "id": "1",
          "firstName": "John",
          "lastName": "Doe",
          "email": "recruiter@techcorp.com",
          "userType": "RECRUITER"
        }
      }
    ]
  }
}
```

### 3. Get Candidate Interviews
**GET** `/candidates/interviews`

Get all interviews for the authenticated candidate.

**Query Parameters:**
- `status` (optional): Filter by interview status (scheduled, in_progress, completed, expired, cancelled)
- `mode` (optional): Filter by interview mode (live, async)
- `applicationId` (optional): Filter by application ID

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "applicationId": "1",
      "scheduledAt": "2024-01-20T14:00:00Z",
      "startedAt": null,
      "endedAt": null,
      "mode": "live",
      "status": "scheduled",
      "durationMinutes": 60,
      "timezone": "UTC",
      "createdBy": "1",
      "aiScore": null,
      "aiFeedbackSummary": null,
      "plagiarismFlagged": false,
      "integrityFlags": null,
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-15T10:00:00Z",
      "application": {
        "id": "1",
        "jobId": 1,
        "candidateId": "1",
        "recruiterId": "1",
        "organizationId": 1,
        "status": "PENDING",
        "applicationDate": "2024-01-15T10:00:00Z",
        "job": {
          "id": 1,
          "name": "Senior Software Engineer",
          "jobCategory": "Software Development",
          "organization": {
            "id": 1,
            "name": "Tech Corp",
            "industry": "Technology"
          }
        },
        "candidate": {
          "id": "1",
          "firstName": "John",
          "lastName": "Smith",
          "email": "candidate1@example.com"
        },
        "recruiter": {
          "id": "1",
          "firstName": "John",
          "lastName": "Doe",
          "email": "recruiter@techcorp.com"
        }
      },
      "creator": {
        "id": "1",
        "firstName": "John",
        "lastName": "Doe",
        "email": "recruiter@techcorp.com",
        "userType": "RECRUITER"
      }
    }
  ],
  "count": 1
}
```

### 4. Get Interview Details
**GET** `/candidates/interviews/:id`

Get detailed information about a specific interview.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "1",
    "applicationId": "1",
    "scheduledAt": "2024-01-20T14:00:00Z",
    "startedAt": null,
    "endedAt": null,
    "mode": "live",
    "status": "scheduled",
    "durationMinutes": 60,
    "timezone": "UTC",
    "createdBy": "1",
    "aiScore": null,
    "aiFeedbackSummary": null,
    "plagiarismFlagged": false,
    "integrityFlags": null,
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z",
    "application": {
      "id": "1",
      "jobId": 1,
      "candidateId": "1",
      "recruiterId": "1",
      "organizationId": 1,
      "status": "PENDING",
      "applicationDate": "2024-01-15T10:00:00Z",
      "notes": "Candidates from LinkedIn recruitment campaign",
      "isInvited": false,
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-15T10:00:00Z",
      "job": {
        "id": 1,
        "name": "Senior Software Engineer",
        "numberOfOpenings": 2,
        "minimumExperience": 3,
        "maximumExperience": 8,
        "minAnnualSalary": 80000,
        "maxAnnualSalary": 150000,
        "jobSkill": "JavaScript, React, Node.js, TypeScript",
        "jobCategory": "Software Development",
        "city": "San Francisco",
        "country": "USA",
        "jobDescriptionText": "We are looking for a senior software engineer...",
        "currencyId": 1,
        "salaryType": "annual",
        "jobPostingStatus": "active",
        "createdOn": "2024-01-15T10:00:00Z",
        "updatedOn": "2024-01-15T10:00:00Z",
        "organization": {
          "id": 1,
          "name": "Tech Corp",
          "description": "Leading technology company",
          "website": "https://techcorp.com",
          "industry": "Technology",
          "size": "100-500",
          "location": "San Francisco, CA"
        }
      },
      "candidate": {
        "id": "1",
        "firstName": "John",
        "lastName": "Smith",
        "email": "candidate1@example.com",
        "userType": "CANDIDATE"
      },
      "recruiter": {
        "id": "1",
        "firstName": "John",
        "lastName": "Doe",
        "email": "recruiter@techcorp.com",
        "userType": "RECRUITER"
      }
    },
    "creator": {
      "id": "1",
      "firstName": "John",
      "lastName": "Doe",
      "email": "recruiter@techcorp.com",
      "userType": "RECRUITER"
    }
  }
}
```

### 5. Get Candidate Profile
**GET** `/candidates/profile`

Get the authenticated candidate's profile information.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "1",
    "firstName": "John",
    "lastName": "Smith",
    "email": "candidate1@example.com",
    "userType": "CANDIDATE",
    "userRole": "CANDIDATE",
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z",
    "candidateDetails": {
      "id": "1",
      "userId": "1",
      "phoneNumber": "+1234567890",
      "location": "New York, NY",
      "skills": "JavaScript, React, Node.js",
      "education": "Bachelor's in Computer Science",
      "experience": "5 years of software development",
      "resumeUrl": "https://example.com/resume1.pdf",
      "portfolioUrl": "https://github.com/johnsmith",
      "linkedInUrl": "https://linkedin.com/in/johnsmith",
      "githubUrl": "https://github.com/johnsmith",
      "desiredJobTitle": "Senior Software Engineer",
      "preferredWorkLocation": "Remote",
      "salaryExpectation": 120000,
      "noticePeriod": "2 weeks",
      "workAuthorization": "US Citizen",
      "preferredJobType": "FULL_TIME",
      "languagesSpoken": "English, Spanish",
      "status": "ACTIVE",
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-15T10:00:00Z"
    }
  }
}
```

### 6. Update Candidate Profile
**PUT** `/candidates/profile`

Update the authenticated candidate's profile information.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "candidateDetails": {
    "phoneNumber": "+1234567890",
    "location": "New York, NY",
    "skills": "JavaScript, React, Node.js, TypeScript",
    "education": "Master's in Computer Science",
    "experience": "6 years of software development",
    "resumeUrl": "https://example.com/updated-resume.pdf",
    "portfolioUrl": "https://github.com/johnsmith",
    "linkedInUrl": "https://linkedin.com/in/johnsmith",
    "githubUrl": "https://github.com/johnsmith",
    "desiredJobTitle": "Senior Software Engineer",
    "preferredWorkLocation": "Remote",
    "salaryExpectation": 130000,
    "noticePeriod": "2 weeks",
    "workAuthorization": "US Citizen",
    "preferredJobType": "FULL_TIME",
    "languagesSpoken": "English, Spanish, French"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": "1",
    "firstName": "John",
    "lastName": "Smith",
    "email": "candidate1@example.com",
    "userType": "CANDIDATE",
    "userRole": "CANDIDATE",
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T11:00:00Z",
    "candidateDetails": {
      "id": "1",
      "userId": "1",
      "phoneNumber": "+1234567890",
      "location": "New York, NY",
      "skills": "JavaScript, React, Node.js, TypeScript",
      "education": "Master's in Computer Science",
      "experience": "6 years of software development",
      "resumeUrl": "https://example.com/updated-resume.pdf",
      "portfolioUrl": "https://github.com/johnsmith",
      "linkedInUrl": "https://linkedin.com/in/johnsmith",
      "githubUrl": "https://github.com/johnsmith",
      "desiredJobTitle": "Senior Software Engineer",
      "preferredWorkLocation": "Remote",
      "salaryExpectation": 130000,
      "noticePeriod": "2 weeks",
      "workAuthorization": "US Citizen",
      "preferredJobType": "FULL_TIME",
      "languagesSpoken": "English, Spanish, French",
      "status": "ACTIVE",
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-15T11:00:00Z"
    }
  }
}
```

## Error Handling

All endpoints return consistent error responses:

### Validation Error (400)
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    },
    {
      "field": "password",
      "message": "Password must be at least 8 characters"
    }
  ]
}
```

### Authentication Error (401)
```json
{
  "success": false,
  "message": "Authentication required"
}
```

### Authorization Error (403)
```json
{
  "success": false,
  "message": "Access denied"
}
```

### Not Found Error (404)
```json
{
  "success": false,
  "message": "Resource not found"
}
```

### Server Error (500)
```json
{
  "success": false,
  "message": "Internal server error"
}
```

## Interview Status Flow

1. **pending** - Interview is created but not yet scheduled (default status)
2. **scheduled** - Interview is scheduled with specific date/time
3. **in_progress** - Candidate has started the interview
4. **completed** - Interview has ended (with or without AI results)
5. **expired** - Interview time has passed without being started
6. **cancelled** - Interview was cancelled by recruiter

## Interview Modes

- **live** - Real-time interview with AI interviewer
- **async** - Asynchronous interview with recorded responses

## Application Status Values

- **PENDING** - Application submitted, awaiting review
- **REVIEWING** - Application under review
- **SHORTLISTED** - Candidate shortlisted for interview
- **REJECTED** - Application rejected
- **HIRED** - Candidate hired
- **WITHDRAWN** - Application withdrawn by candidate

## Rate Limiting

The API implements rate limiting to prevent abuse:
- **Limit:** 100 requests per 15 minutes per IP address
- **Headers:** Rate limit information is included in response headers
- **Exceeded Response:**
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "message": "Too many requests from this IP, please try again later."
}
```

## Pagination

Most list endpoints support pagination with the following parameters:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10, max: 100)
- `sortBy` - Sort field (default: createdAt)
- `sortOrder` - Sort order: asc/desc (default: desc)

Pagination response includes:
```json
{
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
``` 