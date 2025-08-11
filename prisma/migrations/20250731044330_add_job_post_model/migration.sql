-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('RECRUITER', 'CANDIDATE');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER', 'STAFF');

-- CreateEnum
CREATE TYPE "CandidateStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN');

-- CreateTable
CREATE TABLE "users" (
    "id" BIGSERIAL NOT NULL,
    "organizationId" INTEGER,
    "userType" VARCHAR(50) NOT NULL,
    "userRole" VARCHAR(50) NOT NULL,
    "photoUrl" VARCHAR(255),
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "emailVerifiedAt" TIMESTAMP(3),
    "emailVerificationToken" VARCHAR(255),
    "emailVerificationExpires" TIMESTAMP(3),
    "passwordResetToken" VARCHAR(255),
    "passwordResetExpires" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_details" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "phoneNumber" VARCHAR(20),
    "location" VARCHAR(255),
    "skills" TEXT,
    "education" TEXT,
    "experience" TEXT,
    "resumeUrl" VARCHAR(255),
    "portfolioUrl" VARCHAR(255),
    "linkedInUrl" VARCHAR(255),
    "githubUrl" VARCHAR(255),
    "desiredJobTitle" VARCHAR(100),
    "preferredWorkLocation" VARCHAR(100),
    "salaryExpectation" DECIMAL(10,2),
    "noticePeriod" VARCHAR(50),
    "workAuthorization" VARCHAR(100),
    "linkedInProfile" VARCHAR(255),
    "preferredJobType" VARCHAR(50),
    "languagesSpoken" TEXT,
    "status" VARCHAR(50),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "candidate_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "website" VARCHAR(255),
    "industry" VARCHAR(100),
    "size" VARCHAR(50),
    "location" VARCHAR(100),

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_posts" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "numberOfOpenings" INTEGER NOT NULL,
    "minimumExperience" INTEGER NOT NULL,
    "maximumExperience" INTEGER NOT NULL,
    "minAnnualSalary" INTEGER NOT NULL,
    "maxAnnualSalary" INTEGER NOT NULL,
    "jobSkill" TEXT NOT NULL,
    "jobCategory" VARCHAR(100) NOT NULL,
    "city" VARCHAR(100),
    "locality" VARCHAR(100),
    "country" VARCHAR(100),
    "state" VARCHAR(100),
    "address" TEXT,
    "enableJobApplicationForm" BOOLEAN NOT NULL DEFAULT false,
    "specialization" VARCHAR(100),
    "jobDescriptionText" TEXT,
    "currencyId" INTEGER NOT NULL,
    "salaryType" VARCHAR(50) NOT NULL,
    "jobPostingStatus" VARCHAR(50) NOT NULL,
    "applicationFormUrl" VARCHAR(255),
    "sharedJobImage" VARCHAR(255),
    "createdOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" INTEGER NOT NULL,
    "updatedOn" TIMESTAMP(3) NOT NULL,
    "updatedBy" INTEGER NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "userId" BIGINT NOT NULL,

    CONSTRAINT "job_posts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_organizationId_idx" ON "users"("organizationId");

-- CreateIndex
CREATE INDEX "users_userType_idx" ON "users"("userType");

-- CreateIndex
CREATE INDEX "users_userRole_idx" ON "users"("userRole");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");

-- CreateIndex
CREATE INDEX "users_deletedAt_idx" ON "users"("deletedAt");

-- CreateIndex
CREATE INDEX "users_emailVerifiedAt_idx" ON "users"("emailVerifiedAt");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_details_userId_key" ON "candidate_details"("userId");

-- CreateIndex
CREATE INDEX "candidate_details_userId_idx" ON "candidate_details"("userId");

-- CreateIndex
CREATE INDEX "candidate_details_skills_idx" ON "candidate_details"("skills");

-- CreateIndex
CREATE INDEX "candidate_details_location_idx" ON "candidate_details"("location");

-- CreateIndex
CREATE INDEX "candidate_details_status_idx" ON "candidate_details"("status");

-- CreateIndex
CREATE INDEX "candidate_details_createdAt_idx" ON "candidate_details"("createdAt");

-- CreateIndex
CREATE INDEX "organizations_name_idx" ON "organizations"("name");

-- CreateIndex
CREATE UNIQUE INDEX "job_posts_slug_key" ON "job_posts"("slug");

-- CreateIndex
CREATE INDEX "job_posts_organizationId_idx" ON "job_posts"("organizationId");

-- CreateIndex
CREATE INDEX "job_posts_userId_idx" ON "job_posts"("userId");

-- CreateIndex
CREATE INDEX "job_posts_jobCategory_idx" ON "job_posts"("jobCategory");

-- CreateIndex
CREATE INDEX "job_posts_city_idx" ON "job_posts"("city");

-- CreateIndex
CREATE INDEX "job_posts_jobPostingStatus_idx" ON "job_posts"("jobPostingStatus");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_details" ADD CONSTRAINT "candidate_details_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_posts" ADD CONSTRAINT "job_posts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_posts" ADD CONSTRAINT "job_posts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
