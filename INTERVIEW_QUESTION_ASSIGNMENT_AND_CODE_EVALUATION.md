# Interview Question Assignment and Code Evaluation System

## Overview

This document describes the implementation of automatic question assignment and code evaluation features for coding interviews. The system automatically assigns DSA questions to interviews and provides real-time code evaluation using Judge0 API.

## Features Implemented

### 1. Automatic Question Assignment

When a coding interview is created, the system automatically assigns 2 random DSA questions:
- **First Question**: Medium difficulty
- **Second Question**: Easy difficulty

### 2. Progressive Question Access

The system implements a progressive question access mechanism:
- Users can only see the next question after submitting the current one
- The first question (medium) must be submitted before accessing the second question (easy)
- If all questions are submitted, the last question is shown

### 3. Code Evaluation with Judge0

The system integrates with Judge0 API for real-time code evaluation:
- Supports multiple programming languages (JavaScript, Python, Java, C++, C)
- Runs all test cases automatically
- Provides detailed feedback and scoring
- Calculates execution time and memory usage

## API Endpoints

### 1. Get Interview Questions
```
GET /api/interviews/:interviewId/questions
```

**Response:**
```json
{
  "success": true,
  "data": {
    "questions": [
      {
        "id": "1",
        "orderIndex": 0,
        "dsaQuestion": {
          "id": "1",
          "name": "Two Sum",
          "level": "Medium",
          "problemStatement": "...",
          "inputFormat": "...",
          "constraints": "...",
          "inputExample": "...",
          "outputFormat": "...",
          "outputExample": "...",
          "explanation": "...",
          "editorialAnswerInCpp": "...",
          "testCase1Input": "...",
          "testCase1Output": "...",
          "testCase2Input": "...",
          "testCase2Output": "...",
          "testCase3Input": "...",
          "testCase3Output": "...",
          "topic": "arrays",
          "timeLimit": 30
        }
      }
    ],
    "currentQuestionIndex": 0,
    "totalQuestions": 2
  }
}
```

### 2. Submit Code
```
POST /api/interviews/submit-code
```

**Request Body:**
```json
{
  "dsaQuestionId": "1",
  "interviewId": "1",
  "userCode": "function twoSum(nums, target) { ... }",
  "language": "javascript"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Code submitted and evaluated successfully",
  "data": {
    "id": "1",
    "dsaQuestionId": "1",
    "userId": "1",
    "interviewId": "1",
    "userCode": "function twoSum(nums, target) { ... }",
    "language": "javascript",
    "attemptNumber": 1,
    "isSubmitted": true,
    "submittedAt": "2024-01-01T00:00:00.000Z",
    "executionTime": 15,
    "memoryUsed": 45,
    "testCasesPassed": 3,
    "totalTestCases": 3,
    "score": 100.0,
    "feedback": "Test Case 1: PASSED\nTest Case 2: PASSED\nTest Case 3: PASSED"
  }
}
```

### 3. Get Interview Submissions
```
GET /api/interviews/:interviewId/submissions
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "dsaQuestionId": "1",
      "userId": "1",
      "interviewId": "1",
      "userCode": "...",
      "language": "javascript",
      "attemptNumber": 1,
      "isSubmitted": true,
      "submittedAt": "2024-01-01T00:00:00.000Z",
      "executionTime": 15,
      "memoryUsed": 45,
      "testCasesPassed": 3,
      "totalTestCases": 3,
      "score": 100.0,
      "feedback": "...",
      "dsaQuestion": {
        "id": "1",
        "name": "Two Sum",
        "level": "Medium"
      }
    }
  ],
  "count": 1
}
```

### 4. Get User Submissions for Specific Question
```
GET /api/interviews/questions/:questionId/submissions
```

## Database Schema Updates

### InterviewQuestion Model
```prisma
model InterviewQuestion {
  id            BigInt      @id @default(autoincrement())
  interviewId   BigInt
  dsaQuestionId BigInt
  orderIndex    Int         @default(0)
  timeLimit     Int?
  createdAt     DateTime    @default(now())

  interview     Interview   @relation(fields: [interviewId], references: [id], onDelete: Cascade)
  dsaQuestion   DsaQuestion @relation(fields: [dsaQuestionId], references: [id], onDelete: Cascade)

  @@unique([interviewId, dsaQuestionId])
  @@index([interviewId])
  @@index([dsaQuestionId])
  @@index([orderIndex])
  @@map("interview_questions")
}
```

### UserCodeSubmission Model
```prisma
model UserCodeSubmission {
  id                BigInt      @id @default(autoincrement())
  dsaQuestionId     BigInt
  userId            BigInt
  interviewId       BigInt?
  userCode          String      @db.Text
  language          String      @db.VarChar(50)
  attemptNumber     Int         @default(1)
  isSubmitted       Boolean     @default(false)
  submittedAt       DateTime?
  executionTime     Int?
  memoryUsed        Int?
  testCasesPassed   Int?
  totalTestCases    Int?
  score             Decimal?    @db.Decimal(5, 2)
  feedback          String?     @db.Text
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt

  dsaQuestion       DsaQuestion @relation(fields: [dsaQuestionId], references: [id], onDelete: Cascade)
  user              User        @relation("UserCodeSubmissions", fields: [userId], references: [id])
  interview         Interview?  @relation(fields: [interviewId], references: [id], onDelete: SetNull)

  @@index([dsaQuestionId])
  @@index([userId])
  @@index([interviewId])
  @@index([language])
  @@index([attemptNumber])
  @@index([isSubmitted])
  @@map("user_code_submissions")
}
```

## Judge0 Integration

### Supported Languages
- **JavaScript**: Language ID 63 (Node.js)
- **Python**: Language ID 71 (Python 3)
- **Java**: Language ID 62 (Java)
- **C++**: Language ID 54 (C++17)
- **C**: Language ID 50 (C)

### Evaluation Process
1. **Code Submission**: User code is submitted to Judge0 API
2. **Test Case Execution**: Each test case is executed separately
3. **Result Analysis**: Output is compared with expected results
4. **Scoring**: Score is calculated based on passed test cases
5. **Feedback Generation**: Detailed feedback is provided for each test case

### Error Handling
- **Compilation Errors**: Detected and reported
- **Runtime Errors**: Caught and included in feedback
- **Timeout Errors**: Handled gracefully
- **API Errors**: Proper error messages returned

## Implementation Details

### Service Layer
- `InterviewService.assignRandomQuestionsToInterview()`: Assigns random questions
- `InterviewService.getInterviewQuestions()`: Returns questions based on submission status
- `InterviewService.submitCode()`: Handles code submission and evaluation
- `InterviewService.evaluateCodeWithJudge0()`: Integrates with Judge0 API

### Controller Layer
- `InterviewController.getInterviewQuestions()`: API endpoint for fetching questions
- `InterviewController.submitCode()`: API endpoint for code submission
- `InterviewController.getInterviewSubmissions()`: API endpoint for submission history

### Route Configuration
```typescript
// Interview Questions and Code Submission
router.get('/:interviewId/questions', interviewController.getInterviewQuestions.bind(interviewController));
router.post('/submit-code', interviewController.submitCode.bind(interviewController));
router.get('/:interviewId/submissions', interviewController.getInterviewSubmissions.bind(interviewController));
router.get('/questions/:questionId/submissions', interviewController.getUserSubmissions.bind(interviewController));
```

## Usage Flow

### 1. Interview Creation
```typescript
// When a coding interview is created
const interview = await interviewService.createInterview({
  applicationId: 1,
  interviewType: 'coding',
  // ... other fields
});

// Questions are automatically assigned
// - 1 Medium difficulty question
// - 1 Easy difficulty question
```

### 2. Question Access
```typescript
// Get questions for interview
const result = await interviewService.getInterviewQuestions(interviewId, userId);

// Returns questions based on submission status
// - If no submissions: returns first question
// - If first question submitted: returns second question
// - If all submitted: returns last question
```

### 3. Code Submission
```typescript
// Submit code for evaluation
const submission = await interviewService.submitCode({
  dsaQuestionId: 1,
  userId: 1,
  interviewId: 1,
  userCode: "function solution() { ... }",
  language: "javascript"
});

// Code is automatically evaluated using Judge0
// Results are saved to database
```

## Configuration

### Judge0 Setup
- **Base URL**: `http://localhost:2358`
- **Timeout**: 10 seconds per test case
- **Max Attempts**: 10 attempts per test case

### Environment Variables
```env
JUDGE0_BASE_URL=http://localhost:2358
```

## Error Handling

### Common Error Scenarios
1. **No Questions Available**: Thrown when insufficient questions exist
2. **Judge0 Unavailable**: Handled with proper error messages
3. **Invalid Language**: Defaults to JavaScript
4. **Code Execution Timeout**: Proper timeout handling
5. **Database Errors**: Comprehensive error logging

### Error Response Format
```json
{
  "success": false,
  "error": "Error Type",
  "message": "Detailed error message"
}
```

## Testing

### Unit Tests
- Question assignment logic
- Code evaluation process
- Error handling scenarios

### Integration Tests
- API endpoint testing
- Judge0 integration testing
- Database operations testing

## Future Enhancements

1. **Question Pool Management**: Better distribution of questions across interviews
2. **Advanced Scoring**: Weighted scoring based on difficulty and performance
3. **Plagiarism Detection**: Integration with plagiarism detection services
4. **Real-time Collaboration**: Live coding collaboration features
5. **Performance Analytics**: Detailed performance metrics and analytics

## Security Considerations

1. **Code Sanitization**: Input validation and sanitization
2. **Rate Limiting**: Prevent abuse of Judge0 API
3. **Access Control**: Proper authorization checks
4. **Data Privacy**: Secure handling of user code and submissions

## Monitoring and Logging

- **Question Assignment**: Logged with question IDs and interview details
- **Code Submissions**: Tracked with execution metrics
- **Judge0 API Calls**: Monitored for performance and errors
- **Error Tracking**: Comprehensive error logging for debugging 