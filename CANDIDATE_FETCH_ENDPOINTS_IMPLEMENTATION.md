# Candidate Fetch Endpoints Implementation

## Overview

This document describes the implementation of the new candidate fetch endpoints as requested. The functionality has been implemented in the existing `recruiter-candidate` module to maintain consistency with the current architecture.

## Implemented Endpoints

### 1. New Candidate Fetch Endpoint

**Endpoint:** `GET /recruiter-candidates/by-email/:email`

**Description:** Fetches candidate details by email ID. Only authenticated users with the recruiter role can access this endpoint.

**Authentication:** Required
**Authorization:** Recruiter role only
**Route File:** `backend/src/routes/recruiter-candidate.routes.ts`
**Controller:** `RecruiterCandidateController.getCandidateByEmail()`
**Service:** `RecruiterCandidateService.getCandidateByEmail()`

**Features:**
- Fetches candidate profile information
- Includes candidate details (skills, experience, etc.)
- Only returns candidates that have applications to jobs in the recruiter's organization
- Proper error handling and validation

**Response Format:**
```json
{
  "success": true,
  "data": {
    "id": "123",
    "email": "candidate@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "candidateDetails": {
      "skills": "JavaScript, React, Node.js",
      "experience": "3 years",
      "location": "New York"
    }
  },
  "message": "Candidate details retrieved successfully"
}
```

### 2. Candidate Applications Endpoint

**Endpoint:** `GET /recruiter-candidates/by-email/:email/with-applications`

**Description:** Fetches candidate details along with the list of applications they are attached to. Only returns applications that belong to the recruiter's organization.

**Authentication:** Required
**Authorization:** Recruiter role only
**Route File:** `backend/src/routes/recruiter-candidate.routes.ts`
**Controller:** `RecruiterCandidateController.getCandidateWithApplicationsByEmail()`
**Service:** `RecruiterCandidateService.getCandidateWithApplicationsByEmail()`

**Features:**
- Fetches complete candidate profile
- Includes all applications filtered by organization
- Each application includes job details and organization information
- Includes interview history for each application
- Applications are ordered by application date (newest first)
- Only returns applications to jobs in the recruiter's organization

**Response Format:**
```json
{
  "success": true,
  "data": {
    "id": "123",
    "email": "candidate@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "candidateDetails": {
      "skills": "JavaScript, React, Node.js",
      "experience": "3 years"
    },
    "applications": [
      {
        "id": "456",
        "status": "REVIEWING",
        "applicationDate": "2024-01-15T10:00:00Z",
        "job": {
          "id": 789,
          "name": "Senior Frontend Developer",
          "organization": {
            "id": 1,
            "name": "Tech Corp"
          }
        },
        "organization": {
          "id": 1,
          "name": "Tech Corp"
        },
        "interviews": [
          {
            "id": "101",
            "scheduledAt": "2024-01-20T14:00:00Z",
            "status": "scheduled",
            "mode": "online"
          }
        ]
      }
    ]
  },
  "message": "Candidate with applications retrieved successfully",
  "count": 1
}
```

## Security Features

### Authentication
- All endpoints require valid JWT authentication
- Token must be provided in Authorization header: `Bearer <token>`

### Authorization
- Only users with recruiter role can access these endpoints
- Uses `AuthMiddleware.requireRecruiter` middleware
- Validates user type and permissions

### Data Isolation
- Candidates are only returned if they have applications to jobs in the recruiter's organization
- Applications are filtered by organization ID
- Prevents cross-organization data access

## Error Handling

The endpoints include comprehensive error handling:

- **400 Bad Request:** Missing or invalid parameters
- **401 Unauthorized:** Missing or invalid authentication
- **403 Forbidden:** User lacks recruiter role
- **404 Not Found:** Candidate not found or not accessible
- **500 Internal Server Error:** Server-side errors

## Usage Examples

### Fetch Candidate by Email
```bash
curl -X GET \
  "http://localhost:3000/recruiter-candidates/by-email/john.doe@example.com" \
  -H "Authorization: Bearer <jwt-token>"
```

### Fetch Candidate with Applications
```bash
curl -X GET \
  "http://localhost:3000/recruiter-candidates/by-email/john.doe@example.com/with-applications" \
  -H "Authorization: Bearer <jwt-token>"
```

## Implementation Details

### File Structure
```
backend/src/
├── routes/
│   └── recruiter-candidate.routes.ts          # Route definitions
├── controllers/
│   └── recruiter-candidate.controller.ts      # Controller logic
└── services/
    └── recruiter-candidate.service.ts         # Business logic
```

### Key Methods Added
1. `getCandidateWithApplicationsByEmail()` - New service method
2. `getCandidateWithApplicationsByEmail()` - New controller method
3. New route: `/by-email/:email/with-applications`

### Database Queries
- Uses Prisma ORM for type-safe database operations
- Includes proper joins for related data (applications, jobs, organizations)
- Filters by organization ID for data isolation
- Orders results by application date

## Testing

To test these endpoints:

1. Ensure you have a valid recruiter JWT token
2. Test with existing candidate emails in your system
3. Verify that only candidates with applications to your organization are returned
4. Check that applications are properly filtered by organization

## Notes

- The endpoints are implemented in the existing `recruiter-candidate` module for consistency
- They follow the same patterns and error handling as existing endpoints
- The implementation ensures proper data isolation between organizations
- All endpoints include comprehensive logging for debugging and monitoring
