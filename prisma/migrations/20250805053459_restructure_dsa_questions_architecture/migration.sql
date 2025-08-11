/*
  Warnings:

  - You are about to drop the column `interviewQuestionId` on the `user_code_submissions` table. All the data in the column will be lost.
  - You are about to drop the `coding_interview_questions` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `dsaQuestionId` to the `user_code_submissions` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "coding_interview_questions" DROP CONSTRAINT "coding_interview_questions_interviewId_fkey";

-- DropForeignKey
ALTER TABLE "user_code_submissions" DROP CONSTRAINT "user_code_submissions_interviewQuestionId_fkey";

-- DropIndex
DROP INDEX "user_code_submissions_interviewQuestionId_idx";

-- AlterTable
ALTER TABLE "user_code_submissions" DROP COLUMN "interviewQuestionId",
ADD COLUMN     "dsaQuestionId" BIGINT NOT NULL,
ADD COLUMN     "feedback" TEXT,
ADD COLUMN     "interviewId" BIGINT,
ADD COLUMN     "score" DECIMAL(5,2);

-- DropTable
DROP TABLE "coding_interview_questions";

-- CreateTable
CREATE TABLE "dsa_questions" (
    "id" BIGSERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "examples" JSONB,
    "constraints" TEXT,
    "difficulty" VARCHAR(20) NOT NULL,
    "topic" VARCHAR(100) NOT NULL,
    "testCases" JSONB NOT NULL,
    "timeLimit" INTEGER NOT NULL DEFAULT 30,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dsa_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_questions" (
    "id" BIGSERIAL NOT NULL,
    "interviewId" BIGINT NOT NULL,
    "dsaQuestionId" BIGINT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "timeLimit" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interview_questions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dsa_questions_difficulty_idx" ON "dsa_questions"("difficulty");

-- CreateIndex
CREATE INDEX "dsa_questions_topic_idx" ON "dsa_questions"("topic");

-- CreateIndex
CREATE INDEX "dsa_questions_isActive_idx" ON "dsa_questions"("isActive");

-- CreateIndex
CREATE INDEX "dsa_questions_createdBy_idx" ON "dsa_questions"("createdBy");

-- CreateIndex
CREATE INDEX "interview_questions_interviewId_idx" ON "interview_questions"("interviewId");

-- CreateIndex
CREATE INDEX "interview_questions_dsaQuestionId_idx" ON "interview_questions"("dsaQuestionId");

-- CreateIndex
CREATE INDEX "interview_questions_orderIndex_idx" ON "interview_questions"("orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "interview_questions_interviewId_dsaQuestionId_key" ON "interview_questions"("interviewId", "dsaQuestionId");

-- CreateIndex
CREATE INDEX "user_code_submissions_dsaQuestionId_idx" ON "user_code_submissions"("dsaQuestionId");

-- CreateIndex
CREATE INDEX "user_code_submissions_interviewId_idx" ON "user_code_submissions"("interviewId");

-- AddForeignKey
ALTER TABLE "dsa_questions" ADD CONSTRAINT "dsa_questions_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_questions" ADD CONSTRAINT "interview_questions_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "interviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_questions" ADD CONSTRAINT "interview_questions_dsaQuestionId_fkey" FOREIGN KEY ("dsaQuestionId") REFERENCES "dsa_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_code_submissions" ADD CONSTRAINT "user_code_submissions_dsaQuestionId_fkey" FOREIGN KEY ("dsaQuestionId") REFERENCES "dsa_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_code_submissions" ADD CONSTRAINT "user_code_submissions_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "interviews"("id") ON DELETE SET NULL ON UPDATE CASCADE;
