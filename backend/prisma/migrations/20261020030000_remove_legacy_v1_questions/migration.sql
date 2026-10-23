-- Remove only the unused, unattached v1 question records. Preserve them if
-- they have been used by responses or included in any saved attempt.
DO $$
DECLARE
    referenced_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO referenced_count
    FROM "questions" q
    WHERE q."questionnaireVersionId" IS NULL
      AND q."version" = 1
      AND q."reviewStatus" = 'DRAFT'
      AND q."isActive" = false
      AND q."key" IN (
        'SR_BODY', 'SR_LING', 'SR_LOGI', 'SR_MUSI', 'SR_NATU', 'SR_SPAT',
        'SC_01', 'SC_02', 'SC_03', 'SC_04', 'SC_05', 'SC_06',
        'SC_07', 'SC_08', 'SC_09', 'SC_10', 'SC_11', 'SC_12'
      )
      AND (
        EXISTS (
          SELECT 1 FROM "responses" r
          WHERE r."questionVersionId" = q."id"
        )
        OR EXISTS (
          SELECT 1 FROM "assessment_sessions" a
          WHERE a."questionOrder"::jsonb @> to_jsonb(q."id")
        )
      );

    IF referenced_count > 0 THEN
        RAISE EXCEPTION 'Cannot delete legacy v1 questions: % are referenced by saved assessment data.', referenced_count;
    END IF;
END $$;

DELETE FROM "questions" q
WHERE q."questionnaireVersionId" IS NULL
  AND q."version" = 1
  AND q."reviewStatus" = 'DRAFT'
  AND q."isActive" = false
  AND q."key" IN (
    'SR_BODY', 'SR_LING', 'SR_LOGI', 'SR_MUSI', 'SR_NATU', 'SR_SPAT',
    'SC_01', 'SC_02', 'SC_03', 'SC_04', 'SC_05', 'SC_06',
    'SC_07', 'SC_08', 'SC_09', 'SC_10', 'SC_11', 'SC_12'
  );
