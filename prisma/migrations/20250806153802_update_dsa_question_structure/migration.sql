/*
  Warnings:

  - You are about to drop the column `description` on the `dsa_questions` table. All the data in the column will be lost.
  - You are about to drop the column `difficulty` on the `dsa_questions` table. All the data in the column will be lost.
  - You are about to drop the column `examples` on the `dsa_questions` table. All the data in the column will be lost.
  - You are about to drop the column `testCases` on the `dsa_questions` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `dsa_questions` table. All the data in the column will be lost.
*/

-- DropIndex
DROP INDEX "dsa_questions_difficulty_idx";

-- Step 1: Add new columns with default values
ALTER TABLE "dsa_questions" ADD COLUMN "editorialAnswerInCpp" TEXT DEFAULT '';
ALTER TABLE "dsa_questions" ADD COLUMN "explanation" TEXT DEFAULT '';
ALTER TABLE "dsa_questions" ADD COLUMN "inputExample" TEXT DEFAULT '';
ALTER TABLE "dsa_questions" ADD COLUMN "inputFormat" TEXT DEFAULT '';
ALTER TABLE "dsa_questions" ADD COLUMN "level" VARCHAR(20) DEFAULT 'Easy';
ALTER TABLE "dsa_questions" ADD COLUMN "name" VARCHAR(255) DEFAULT '';
ALTER TABLE "dsa_questions" ADD COLUMN "outputExample" TEXT DEFAULT '';
ALTER TABLE "dsa_questions" ADD COLUMN "outputFormat" TEXT DEFAULT '';
ALTER TABLE "dsa_questions" ADD COLUMN "problemStatement" TEXT DEFAULT '';
ALTER TABLE "dsa_questions" ADD COLUMN "testCase1Input" TEXT DEFAULT '';
ALTER TABLE "dsa_questions" ADD COLUMN "testCase1Output" TEXT DEFAULT '';
ALTER TABLE "dsa_questions" ADD COLUMN "testCase2Input" TEXT DEFAULT '';
ALTER TABLE "dsa_questions" ADD COLUMN "testCase2Output" TEXT DEFAULT '';
ALTER TABLE "dsa_questions" ADD COLUMN "testCase3Input" TEXT DEFAULT '';
ALTER TABLE "dsa_questions" ADD COLUMN "testCase3Output" TEXT DEFAULT '';

-- Step 2: Update new columns with data from old columns where possible
UPDATE "dsa_questions" SET 
  "name" = COALESCE("title", ''),
  "level" = COALESCE("difficulty", 'Easy'),
  "problemStatement" = COALESCE("description", ''),
  "constraints" = COALESCE("constraints", '')
WHERE "title" IS NOT NULL OR "difficulty" IS NOT NULL OR "description" IS NOT NULL;

-- Step 3: Make new columns NOT NULL
ALTER TABLE "dsa_questions" ALTER COLUMN "editorialAnswerInCpp" SET NOT NULL;
ALTER TABLE "dsa_questions" ALTER COLUMN "explanation" SET NOT NULL;
ALTER TABLE "dsa_questions" ALTER COLUMN "inputExample" SET NOT NULL;
ALTER TABLE "dsa_questions" ALTER COLUMN "inputFormat" SET NOT NULL;
ALTER TABLE "dsa_questions" ALTER COLUMN "level" SET NOT NULL;
ALTER TABLE "dsa_questions" ALTER COLUMN "name" SET NOT NULL;
ALTER TABLE "dsa_questions" ALTER COLUMN "outputExample" SET NOT NULL;
ALTER TABLE "dsa_questions" ALTER COLUMN "outputFormat" SET NOT NULL;
ALTER TABLE "dsa_questions" ALTER COLUMN "problemStatement" SET NOT NULL;
ALTER TABLE "dsa_questions" ALTER COLUMN "testCase1Input" SET NOT NULL;
ALTER TABLE "dsa_questions" ALTER COLUMN "testCase1Output" SET NOT NULL;
ALTER TABLE "dsa_questions" ALTER COLUMN "testCase2Input" SET NOT NULL;
ALTER TABLE "dsa_questions" ALTER COLUMN "testCase2Output" SET NOT NULL;
ALTER TABLE "dsa_questions" ALTER COLUMN "testCase3Input" SET NOT NULL;
ALTER TABLE "dsa_questions" ALTER COLUMN "testCase3Output" SET NOT NULL;
ALTER TABLE "dsa_questions" ALTER COLUMN "constraints" SET NOT NULL;

-- Step 4: Drop old columns
ALTER TABLE "dsa_questions" DROP COLUMN "description";
ALTER TABLE "dsa_questions" DROP COLUMN "difficulty";
ALTER TABLE "dsa_questions" DROP COLUMN "examples";
ALTER TABLE "dsa_questions" DROP COLUMN "testCases";
ALTER TABLE "dsa_questions" DROP COLUMN "title";

-- CreateIndex
CREATE INDEX "dsa_questions_level_idx" ON "dsa_questions"("level");
