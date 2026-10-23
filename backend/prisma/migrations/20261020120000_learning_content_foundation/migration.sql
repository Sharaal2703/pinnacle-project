CREATE TYPE "LearningResourceFormat" AS ENUM ('VIDEO', 'IMAGE', 'PDF');
CREATE TYPE "LearningResourceStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'PUBLISHED', 'REJECTED', 'NEEDS_REVISION', 'ARCHIVED');
CREATE TYPE "ConceptDifficulty" AS ENUM ('EASY', 'MEDIUM', 'CHALLENGING');
CREATE TYPE "ConceptProgressStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'NEEDS_REVIEW');

CREATE TABLE "curriculum_chapters" (
  "id" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "grade" SMALLINT NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "description" TEXT,
  "curriculumReference" TEXT,
  "orderIndex" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "curriculum_chapters_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "curriculum_concepts" (
  "id" TEXT NOT NULL,
  "chapterId" TEXT NOT NULL,
  "conceptKey" VARCHAR(100) NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "description" TEXT,
  "learningObjective" TEXT,
  "curriculumReference" TEXT,
  "difficulty" "ConceptDifficulty" NOT NULL DEFAULT 'MEDIUM',
  "orderIndex" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "curriculum_concepts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "learning_resources" (
  "id" TEXT NOT NULL,
  "resourceKey" VARCHAR(100) NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "conceptId" TEXT NOT NULL,
  "pathwayId" TEXT NOT NULL,
  "format" "LearningResourceFormat" NOT NULL,
  "languageCode" VARCHAR(10) NOT NULL DEFAULT 'en',
  "title" VARCHAR(200) NOT NULL,
  "status" "LearningResourceStatus" NOT NULL DEFAULT 'DRAFT',
  "storageBucket" VARCHAR(100),
  "storagePath" VARCHAR(500),
  "mimeType" VARCHAR(100),
  "fileSizeBytes" BIGINT,
  "durationSeconds" INTEGER,
  "sourceReference" TEXT,
  "createdById" TEXT NOT NULL,
  "reviewedById" TEXT,
  "uploadedById" TEXT,
  "reviewNotes" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "learning_resources_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "concept_progress" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "conceptId" TEXT NOT NULL,
  "status" "ConceptProgressStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "progressPercent" SMALLINT NOT NULL DEFAULT 0,
  "lastResourceId" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "concept_progress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "curriculum_chapters_subjectId_grade_orderIndex_key" ON "curriculum_chapters"("subjectId", "grade", "orderIndex");
CREATE INDEX "curriculum_chapters_grade_subjectId_isActive_idx" ON "curriculum_chapters"("grade", "subjectId", "isActive");
CREATE UNIQUE INDEX "curriculum_concepts_chapterId_conceptKey_key" ON "curriculum_concepts"("chapterId", "conceptKey");
CREATE UNIQUE INDEX "curriculum_concepts_chapterId_orderIndex_key" ON "curriculum_concepts"("chapterId", "orderIndex");
CREATE INDEX "curriculum_concepts_chapterId_isActive_idx" ON "curriculum_concepts"("chapterId", "isActive");
CREATE UNIQUE INDEX "learning_resources_resourceKey_version_key" ON "learning_resources"("resourceKey", "version");
CREATE UNIQUE INDEX "learning_resources_storageBucket_storagePath_key" ON "learning_resources"("storageBucket", "storagePath");
CREATE INDEX "learning_resources_conceptId_status_isActive_idx" ON "learning_resources"("conceptId", "status", "isActive");
CREATE INDEX "learning_resources_pathwayId_status_languageCode_idx" ON "learning_resources"("pathwayId", "status", "languageCode");
CREATE UNIQUE INDEX "concept_progress_studentId_conceptId_key" ON "concept_progress"("studentId", "conceptId");
CREATE INDEX "concept_progress_studentId_status_idx" ON "concept_progress"("studentId", "status");

ALTER TABLE "curriculum_chapters" ADD CONSTRAINT "curriculum_chapters_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "curriculum_concepts" ADD CONSTRAINT "curriculum_concepts_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "curriculum_chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "learning_resources" ADD CONSTRAINT "learning_resources_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "curriculum_concepts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "learning_resources" ADD CONSTRAINT "learning_resources_pathwayId_fkey" FOREIGN KEY ("pathwayId") REFERENCES "intelligence_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "learning_resources" ADD CONSTRAINT "learning_resources_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "learning_resources" ADD CONSTRAINT "learning_resources_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "learning_resources" ADD CONSTRAINT "learning_resources_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "concept_progress" ADD CONSTRAINT "concept_progress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "concept_progress" ADD CONSTRAINT "concept_progress_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "curriculum_concepts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "concept_progress" ADD CONSTRAINT "concept_progress_lastResourceId_fkey" FOREIGN KEY ("lastResourceId") REFERENCES "learning_resources"("id") ON DELETE SET NULL ON UPDATE CASCADE;
