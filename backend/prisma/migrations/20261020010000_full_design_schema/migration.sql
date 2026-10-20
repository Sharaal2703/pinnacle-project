-- Expand the existing pre-assessment schema to cover the complete design
-- document model while retaining all existing assessment data.

ALTER TYPE "PathwayCode" RENAME VALUE 'MUSIC' TO 'MUSI';
ALTER TYPE "Role" ADD VALUE 'TEACHER';
ALTER TYPE "AttemptStatus" ADD VALUE 'SUBMITTED';
ALTER TYPE "AttemptStatus" ADD VALUE 'EXPIRED';
CREATE TYPE "ObserverRole" AS ENUM ('PARENT', 'TEACHER');

ALTER TABLE "users" ADD COLUMN "email" TEXT;
ALTER TABLE "users" ADD COLUMN "phone" TEXT;
ALTER TABLE "users" ADD COLUMN "location" TEXT;

ALTER TABLE "pathways" RENAME TO "intelligence_types";
ALTER TABLE "question_versions" RENAME TO "questions";
ALTER TABLE "question_option_mappings" RENAME TO "option_intelligence_type_mapping";
ALTER TABLE "assessment_attempts" RENAME TO "assessment_sessions";
ALTER TABLE "assessment_responses" RENAME TO "responses";
ALTER TABLE "preference_profiles" RENAME TO "intelligence_profile";
ALTER TABLE "preference_scores" RENAME TO "intelligence_scores";
ALTER TABLE "assessment_configs" RENAME TO "scoring_config";

ALTER TABLE "students"
    ADD COLUMN "schoolId" TEXT,
    ADD COLUMN "classId" TEXT,
    ADD COLUMN "admissionNumber" TEXT;

CREATE TABLE "schools" (
    "id" TEXT NOT NULL,
    "schoolName" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "district" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "schools_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "classes" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "grade" SMALLINT NOT NULL,
    "section" VARCHAR(10) NOT NULL,
    "academicYear" VARCHAR(9) NOT NULL,
    CONSTRAINT "classes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "classes_grade_check" CHECK ("grade" BETWEEN 6 AND 8)
);

CREATE TABLE "teachers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "employeeNumber" TEXT,
    CONSTRAINT "teachers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "subjects" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "teacher_class_assignments" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    CONSTRAINT "teacher_class_assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "student_guardian" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "guardianName" TEXT NOT NULL,
    "guardianPhone" TEXT NOT NULL,
    "guardianEmail" TEXT,
    "relationship" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "student_guardian_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "questions" ADD COLUMN "mediaUrl" TEXT;
CREATE TABLE "question_intelligence_type_mappings" (
    "id" TEXT NOT NULL,
    "questionVersionId" TEXT NOT NULL,
    "pathwayId" TEXT NOT NULL,
    "contribution" DECIMAL(65,30) NOT NULL DEFAULT 1.0,
    CONSTRAINT "question_intelligence_type_mappings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "question_intelligence_type_mappings" ("id", "questionVersionId", "pathwayId", "contribution")
SELECT gen_random_uuid()::text, "id", "pathwayId", 1.0
FROM "questions"
WHERE "pathwayId" IS NOT NULL;

ALTER TABLE "questions" DROP CONSTRAINT "question_versions_pathwayId_fkey";
ALTER TABLE "questions" DROP COLUMN "pathwayId";

ALTER TABLE "assessment_sessions"
    ADD COLUMN "totalTimeLimitSec" INTEGER NOT NULL DEFAULT 2280,
    ADD COLUMN "expiresAt" TIMESTAMP(3);

CREATE TABLE "observations" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "observerUserId" TEXT NOT NULL,
    "observerRole" "ObserverRole" NOT NULL,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "observations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "observation_ratings" (
    "observationId" TEXT NOT NULL,
    "pathwayId" TEXT NOT NULL,
    "rating" SMALLINT NOT NULL,
    CONSTRAINT "observation_ratings_pkey" PRIMARY KEY ("observationId", "pathwayId"),
    CONSTRAINT "observation_ratings_rating_check" CHECK ("rating" BETWEEN 1 AND 5)
);

ALTER TABLE "scoring_config"
    ADD COLUMN "ratingMax" SMALLINT NOT NULL DEFAULT 5,
    ADD COLUMN "questionCount" SMALLINT NOT NULL DEFAULT 40,
    ADD COLUMN "selfReportCount" SMALLINT NOT NULL DEFAULT 24,
    ADD COLUMN "scenarioCount" SMALLINT NOT NULL DEFAULT 16,
    ADD COLUMN "targetTimeMinSec" INTEGER NOT NULL DEFAULT 1200,
    ADD COLUMN "targetTimeMaxSec" INTEGER NOT NULL DEFAULT 2280;

CREATE UNIQUE INDEX "students_schoolId_admissionNumber_key" ON "students"("schoolId", "admissionNumber");
CREATE INDEX "students_schoolId_classId_idx" ON "students"("schoolId", "classId");
CREATE UNIQUE INDEX "classes_schoolId_grade_section_academicYear_key" ON "classes"("schoolId", "grade", "section", "academicYear");
CREATE UNIQUE INDEX "teachers_userId_key" ON "teachers"("userId");
CREATE UNIQUE INDEX "teachers_schoolId_employeeNumber_key" ON "teachers"("schoolId", "employeeNumber");
CREATE UNIQUE INDEX "subjects_code_key" ON "subjects"("code");
CREATE UNIQUE INDEX "subjects_name_key" ON "subjects"("name");
CREATE UNIQUE INDEX "teacher_class_assignments_teacherId_classId_subjectId_key" ON "teacher_class_assignments"("teacherId", "classId", "subjectId");
CREATE UNIQUE INDEX "question_intelligence_type_mappings_questionVersionId_pathwayId_key" ON "question_intelligence_type_mappings"("questionVersionId", "pathwayId");
CREATE INDEX "observations_studentId_createdAt_idx" ON "observations"("studentId", "createdAt");

ALTER TABLE "students" ADD CONSTRAINT "students_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "students" ADD CONSTRAINT "students_classId_fkey"
    FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "classes" ADD CONSTRAINT "classes_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "teacher_class_assignments" ADD CONSTRAINT "teacher_class_assignments_teacherId_fkey"
    FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "teacher_class_assignments" ADD CONSTRAINT "teacher_class_assignments_classId_fkey"
    FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "teacher_class_assignments" ADD CONSTRAINT "teacher_class_assignments_subjectId_fkey"
    FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "student_guardian" ADD CONSTRAINT "student_guardian_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "question_intelligence_type_mappings" ADD CONSTRAINT "question_intelligence_type_mappings_questionVersionId_fkey"
    FOREIGN KEY ("questionVersionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "question_intelligence_type_mappings" ADD CONSTRAINT "question_intelligence_type_mappings_pathwayId_fkey"
    FOREIGN KEY ("pathwayId") REFERENCES "intelligence_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "observations" ADD CONSTRAINT "observations_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "observations" ADD CONSTRAINT "observations_observerUserId_fkey"
    FOREIGN KEY ("observerUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "observation_ratings" ADD CONSTRAINT "observation_ratings_observationId_fkey"
    FOREIGN KEY ("observationId") REFERENCES "observations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "observation_ratings" ADD CONSTRAINT "observation_ratings_pathwayId_fkey"
    FOREIGN KEY ("pathwayId") REFERENCES "intelligence_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
