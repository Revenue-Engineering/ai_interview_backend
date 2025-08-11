/*
  Warnings:

  - Added the required column `interviewType` to the `interviews` table without a default value. This is not possible if the table is not empty.
  - Added the required column `timeSlotEnd` to the `interviews` table without a default value. This is not possible if the table is not empty.
  - Added the required column `timeSlotStart` to the `interviews` table without a default value. This is not possible if the table is not empty.

*/

-- First, add columns with default values
ALTER TABLE "interviews" ADD COLUMN "interviewType" VARCHAR(50) DEFAULT 'technical';
ALTER TABLE "interviews" ADD COLUMN "timeSlotEnd" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP + INTERVAL '1 hour';
ALTER TABLE "interviews" ADD COLUMN "timeSlotStart" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

-- Update existing records to have proper values
UPDATE "interviews" 
SET 
    "interviewType" = 'technical',
    "timeSlotStart" = "scheduledAt",
    "timeSlotEnd" = "scheduledAt" + INTERVAL '1 hour'
WHERE "interviewType" = 'technical';

-- Make columns NOT NULL after updating existing data
ALTER TABLE "interviews" ALTER COLUMN "interviewType" SET NOT NULL;
ALTER TABLE "interviews" ALTER COLUMN "timeSlotEnd" SET NOT NULL;
ALTER TABLE "interviews" ALTER COLUMN "timeSlotStart" SET NOT NULL;

-- Remove default values
ALTER TABLE "interviews" ALTER COLUMN "interviewType" DROP DEFAULT;
ALTER TABLE "interviews" ALTER COLUMN "timeSlotEnd" DROP DEFAULT;
ALTER TABLE "interviews" ALTER COLUMN "timeSlotStart" DROP DEFAULT;

-- CreateTable
CREATE TABLE "coding_interview_questions" (
    "id" BIGSERIAL NOT NULL,
    "interviewId" BIGINT NOT NULL,
    "questionTitle" VARCHAR(255),
    "questionText" TEXT NOT NULL,
    "questionExamples" JSONB,
    "constraints" TEXT,
    "difficulty" VARCHAR(20) NOT NULL,
    "topic" VARCHAR(100),
    "timeLimit" INTEGER,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coding_interview_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_code_submissions" (
    "id" BIGSERIAL NOT NULL,
    "interviewQuestionId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "userCode" TEXT NOT NULL,
    "language" VARCHAR(50) NOT NULL,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "isSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3),
    "executionTime" INTEGER,
    "memoryUsed" INTEGER,
    "testCasesPassed" INTEGER,
    "totalTestCases" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_code_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "coding_interview_questions_interviewId_idx" ON "coding_interview_questions"("interviewId");

-- CreateIndex
CREATE INDEX "coding_interview_questions_difficulty_idx" ON "coding_interview_questions"("difficulty");

-- CreateIndex
CREATE INDEX "coding_interview_questions_topic_idx" ON "coding_interview_questions"("topic");

-- CreateIndex
CREATE INDEX "coding_interview_questions_orderIndex_idx" ON "coding_interview_questions"("orderIndex");

-- CreateIndex
CREATE INDEX "user_code_submissions_interviewQuestionId_idx" ON "user_code_submissions"("interviewQuestionId");

-- CreateIndex
CREATE INDEX "user_code_submissions_userId_idx" ON "user_code_submissions"("userId");

-- CreateIndex
CREATE INDEX "user_code_submissions_language_idx" ON "user_code_submissions"("language");

-- CreateIndex
CREATE INDEX "user_code_submissions_attemptNumber_idx" ON "user_code_submissions"("attemptNumber");

-- CreateIndex
CREATE INDEX "user_code_submissions_isSubmitted_idx" ON "user_code_submissions"("isSubmitted");

-- CreateIndex
CREATE INDEX "interviews_interviewType_idx" ON "interviews"("interviewType");

-- CreateIndex
CREATE INDEX "interviews_timeSlotStart_idx" ON "interviews"("timeSlotStart");

-- CreateIndex
CREATE INDEX "interviews_timeSlotEnd_idx" ON "interviews"("timeSlotEnd");

-- AddForeignKey
ALTER TABLE "coding_interview_questions" ADD CONSTRAINT "coding_interview_questions_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "interviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_code_submissions" ADD CONSTRAINT "user_code_submissions_interviewQuestionId_fkey" FOREIGN KEY ("interviewQuestionId") REFERENCES "coding_interview_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_code_submissions" ADD CONSTRAINT "user_code_submissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
