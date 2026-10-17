-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'ADMIN');

-- CreateEnum
CREATE TYPE "PathwayCode" AS ENUM ('LING', 'LOGI', 'SPAT', 'MUSI', 'BODY', 'NATU');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('SELF_REPORT', 'SCENARIO');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('DRAFT', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('IN_PROGRESS', 'SCORED', 'INCOMPLETE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "grade" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pathways" (
    "id" TEXT NOT NULL,
    "code" "PathwayCode" NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "pathways_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_versions" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "type" "QuestionType" NOT NULL,
    "prompt" TEXT NOT NULL,
    "gradeMin" INTEGER NOT NULL DEFAULT 6,
    "gradeMax" INTEGER NOT NULL DEFAULT 8,
    "weight" DECIMAL(65,30) NOT NULL DEFAULT 1.0,
    "timeLimitSec" INTEGER NOT NULL DEFAULT 60,
    "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "reviewerName" TEXT,
    "reviewNotes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "pathwayId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_options" (
    "id" TEXT NOT NULL,
    "questionVersionId" TEXT NOT NULL,
    "optionKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "question_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_option_mappings" (
    "id" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "pathwayId" TEXT NOT NULL,
    "contribution" DECIMAL(65,30) NOT NULL DEFAULT 1.0,

    CONSTRAINT "question_option_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_attempts" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "attemptNo" INTEGER NOT NULL DEFAULT 1,
    "status" "AttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "questionOrder" JSONB NOT NULL,
    "currentIndex" INTEGER NOT NULL DEFAULT 1,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "scoringConfigVersion" TEXT NOT NULL DEFAULT '1.0.0',

    CONSTRAINT "assessment_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_responses" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionVersionId" TEXT NOT NULL,
    "optionId" TEXT,
    "answerJson" JSONB NOT NULL,
    "shownAt" TIMESTAMP(3) NOT NULL,
    "answeredAt" TIMESTAMP(3),
    "timeTakenMs" INTEGER,
    "timedOut" BOOLEAN NOT NULL DEFAULT false,
    "responseWeight" DECIMAL(65,30) NOT NULL DEFAULT 0.0,

    CONSTRAINT "assessment_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preference_profiles" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "dominantPathwayId" TEXT NOT NULL,
    "secondaryPathwayId" TEXT NOT NULL,
    "nearTie" BOOLEAN NOT NULL DEFAULT false,
    "scoringVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "preference_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preference_scores" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "pathwayId" TEXT NOT NULL,
    "rawScore" DECIMAL(65,30) NOT NULL DEFAULT 0.0,
    "maxScore" DECIMAL(65,30) NOT NULL DEFAULT 0.0,
    "normalizedScore" DECIMAL(65,30),
    "rankNo" INTEGER NOT NULL,

    CONSTRAINT "preference_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_configs" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "totalLimitSec" INTEGER NOT NULL DEFAULT 1500,
    "selfReportLimitSec" INTEGER NOT NULL DEFAULT 60,
    "scenarioLimitSec" INTEGER NOT NULL DEFAULT 90,
    "gracePeriodSec" INTEGER NOT NULL DEFAULT 2,
    "minAnsweredCount" INTEGER NOT NULL DEFAULT 15,
    "nearTieMargin" DECIMAL(65,30) NOT NULL DEFAULT 5.0,
    "defaultQuestionWeight" DECIMAL(65,30) NOT NULL DEFAULT 1.0,
    "scoringFormulaVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "students_userId_key" ON "students"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "pathways_code_key" ON "pathways"("code");

-- CreateIndex
CREATE UNIQUE INDEX "question_versions_key_version_key" ON "question_versions"("key", "version");

-- CreateIndex
CREATE UNIQUE INDEX "question_options_questionVersionId_optionKey_key" ON "question_options"("questionVersionId", "optionKey");

-- CreateIndex
CREATE UNIQUE INDEX "question_option_mappings_optionId_pathwayId_key" ON "question_option_mappings"("optionId", "pathwayId");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_attempts_studentId_attemptNo_key" ON "assessment_attempts"("studentId", "attemptNo");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_responses_attemptId_questionVersionId_key" ON "assessment_responses"("attemptId", "questionVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "preference_profiles_attemptId_key" ON "preference_profiles"("attemptId");

-- CreateIndex
CREATE UNIQUE INDEX "preference_scores_profileId_pathwayId_key" ON "preference_scores"("profileId", "pathwayId");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_configs_version_key" ON "assessment_configs"("version");

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_versions" ADD CONSTRAINT "question_versions_pathwayId_fkey" FOREIGN KEY ("pathwayId") REFERENCES "pathways"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_options" ADD CONSTRAINT "question_options_questionVersionId_fkey" FOREIGN KEY ("questionVersionId") REFERENCES "question_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_option_mappings" ADD CONSTRAINT "question_option_mappings_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "question_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_option_mappings" ADD CONSTRAINT "question_option_mappings_pathwayId_fkey" FOREIGN KEY ("pathwayId") REFERENCES "pathways"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_responses" ADD CONSTRAINT "assessment_responses_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "assessment_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_responses" ADD CONSTRAINT "assessment_responses_questionVersionId_fkey" FOREIGN KEY ("questionVersionId") REFERENCES "question_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_responses" ADD CONSTRAINT "assessment_responses_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "question_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preference_profiles" ADD CONSTRAINT "preference_profiles_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preference_profiles" ADD CONSTRAINT "preference_profiles_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "assessment_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preference_profiles" ADD CONSTRAINT "preference_profiles_dominantPathwayId_fkey" FOREIGN KEY ("dominantPathwayId") REFERENCES "pathways"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preference_profiles" ADD CONSTRAINT "preference_profiles_secondaryPathwayId_fkey" FOREIGN KEY ("secondaryPathwayId") REFERENCES "pathways"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preference_scores" ADD CONSTRAINT "preference_scores_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "preference_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preference_scores" ADD CONSTRAINT "preference_scores_pathwayId_fkey" FOREIGN KEY ("pathwayId") REFERENCES "pathways"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
