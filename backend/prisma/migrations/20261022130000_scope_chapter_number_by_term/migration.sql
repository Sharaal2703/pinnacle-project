DROP INDEX "curriculum_chapters_subjectId_grade_orderIndex_key";

CREATE UNIQUE INDEX "curriculum_chapters_subjectId_grade_term_orderIndex_key"
ON "curriculum_chapters"("subjectId", "grade", "term", "orderIndex");
