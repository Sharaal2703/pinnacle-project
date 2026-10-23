ALTER TABLE "curriculum_chapters"
ADD COLUMN "term" SMALLINT;

ALTER TABLE "curriculum_chapters"
ADD CONSTRAINT "curriculum_chapters_term_check"
CHECK ("term" IS NULL OR "term" BETWEEN 1 AND 3);