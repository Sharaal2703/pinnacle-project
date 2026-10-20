-- Replace the configurable near-tie range with an exact tie flag. Historical
-- profile flags are recomputed from their stored top two normalized scores.
ALTER TABLE "intelligence_profile" RENAME COLUMN "nearTie" TO "tie";

UPDATE "intelligence_profile" p
SET "tie" = EXISTS (
    SELECT 1
    FROM "intelligence_scores" first_score
    JOIN "intelligence_scores" second_score
      ON second_score."profileId" = first_score."profileId"
    WHERE first_score."profileId" = p."id"
      AND first_score."rankNo" = 1
      AND second_score."rankNo" = 2
      AND first_score."normalizedScore" IS NOT NULL
      AND first_score."normalizedScore" = second_score."normalizedScore"
);

ALTER TABLE "scoring_config" DROP COLUMN "nearTieMargin";
