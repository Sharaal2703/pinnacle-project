-- Align pathway codes with the eight-intelligence questionnaire bank while
-- preserving existing pathway IDs and all score/profile foreign keys.
CREATE TYPE "PathwayCode_new" AS ENUM (
    'LING', 'LOGI', 'VIS', 'MUSIC', 'BODY', 'NAT', 'INTER', 'INTRA'
);

ALTER TABLE "pathways"
    ALTER COLUMN "code" TYPE "PathwayCode_new"
    USING (
        CASE "code"::text
            WHEN 'SPAT' THEN 'VIS'
            WHEN 'MUSI' THEN 'MUSIC'
            WHEN 'NATU' THEN 'NAT'
            ELSE "code"::text
        END
    )::"PathwayCode_new";

DROP TYPE "PathwayCode";
ALTER TYPE "PathwayCode_new" RENAME TO "PathwayCode";

UPDATE "pathways" SET "name" = 'Visual' WHERE "code" = 'VIS';
UPDATE "pathways" SET "name" = 'Musical' WHERE "code" = 'MUSIC';
UPDATE "pathways" SET "name" = 'Naturalistic' WHERE "code" = 'NAT';

INSERT INTO "pathways" ("id", "code", "name")
VALUES
    (gen_random_uuid()::text, 'INTER'::"PathwayCode", 'Interpersonal'),
    (gen_random_uuid()::text, 'INTRA'::"PathwayCode", 'Intrapersonal');

CREATE TYPE "VarkType" AS ENUM ('V', 'A', 'R', 'K');

CREATE TABLE "questionnaire_versions" (
    "id" TEXT NOT NULL,
    "questionnaireId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "gradeMin" INTEGER NOT NULL DEFAULT 6,
    "gradeMax" INTEGER NOT NULL DEFAULT 8,
    "sessionTimeLimitSec" INTEGER NOT NULL DEFAULT 2280,
    "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "reviewerName" TEXT,
    "reviewNotes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "questionnaire_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "question_sources" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "citationNote" TEXT,

    CONSTRAINT "question_sources_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "question_versions"
    ALTER COLUMN "timeLimitSec" SET DEFAULT 45,
    ALTER COLUMN "isActive" SET DEFAULT false,
    ADD COLUMN "questionnaireVersionId" TEXT,
    ADD COLUMN "sourceId" TEXT,
    ADD COLUMN "selectionOrder" INTEGER;

ALTER TABLE "question_options"
    ADD COLUMN "varkType" "VarkType";

ALTER TABLE "assessment_attempts"
    ADD COLUMN "questionnaireVersionId" TEXT;

ALTER TABLE "assessment_configs"
    ALTER COLUMN "totalLimitSec" SET DEFAULT 2280,
    ALTER COLUMN "selfReportLimitSec" SET DEFAULT 45,
    ALTER COLUMN "scenarioLimitSec" SET DEFAULT 75;

-- Keep prior config versions for historical attempts and activate a new
-- version with the selected 24 x 45 sec + 16 x 75 sec assessment limits.
DO $$
DECLARE
    base_config "assessment_configs"%ROWTYPE;
BEGIN
    SELECT * INTO base_config
    FROM "assessment_configs"
    ORDER BY "isActive" DESC, "createdAt" DESC
    LIMIT 1;

    UPDATE "assessment_configs" SET "isActive" = false WHERE "isActive" = true;

    INSERT INTO "assessment_configs" (
        "id", "version", "totalLimitSec", "selfReportLimitSec", "scenarioLimitSec",
        "gracePeriodSec", "minAnsweredCount", "nearTieMargin", "defaultQuestionWeight",
        "scoringFormulaVersion", "isActive"
    ) VALUES (
        gen_random_uuid()::text,
        '2.0.0',
        2280,
        45,
        75,
        COALESCE(base_config."gracePeriodSec", 2),
        COALESCE(base_config."minAnsweredCount", 15),
        COALESCE(base_config."nearTieMargin", 5.0),
        COALESCE(base_config."defaultQuestionWeight", 1.0),
        COALESCE(base_config."scoringFormulaVersion", '1.0.0'),
        true
    )
    ON CONFLICT ("version") DO UPDATE SET
        "totalLimitSec" = EXCLUDED."totalLimitSec",
        "selfReportLimitSec" = EXCLUDED."selfReportLimitSec",
        "scenarioLimitSec" = EXCLUDED."scenarioLimitSec",
        "isActive" = true;
END $$;

CREATE UNIQUE INDEX "questionnaire_versions_questionnaireId_languageCode_version_key"
    ON "questionnaire_versions"("questionnaireId", "languageCode", "version");
CREATE INDEX "question_versions_questionnaireVersionId_idx"
    ON "question_versions"("questionnaireVersionId");
CREATE INDEX "question_versions_sourceId_idx"
    ON "question_versions"("sourceId");
CREATE INDEX "assessment_attempts_questionnaireVersionId_idx"
    ON "assessment_attempts"("questionnaireVersionId");

ALTER TABLE "question_versions"
    ADD CONSTRAINT "question_versions_questionnaireVersionId_fkey"
    FOREIGN KEY ("questionnaireVersionId") REFERENCES "questionnaire_versions"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "question_versions"
    ADD CONSTRAINT "question_versions_sourceId_fkey"
    FOREIGN KEY ("sourceId") REFERENCES "question_sources"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "assessment_attempts"
    ADD CONSTRAINT "assessment_attempts_questionnaireVersionId_fkey"
    FOREIGN KEY ("questionnaireVersionId") REFERENCES "questionnaire_versions"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
