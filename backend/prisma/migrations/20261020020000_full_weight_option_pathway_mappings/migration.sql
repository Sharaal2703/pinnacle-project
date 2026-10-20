-- A selected option contributes one full point to every intelligence type
-- mapped to it. Prior equal-split values (for example, 0.5 or 0.3333) are
-- normalized so existing questionnaire content follows the same rule.
UPDATE "option_intelligence_type_mapping"
SET "contribution" = 1.0
WHERE "contribution" <> 1.0;

ALTER TABLE "option_intelligence_type_mapping"
ADD CONSTRAINT "option_intelligence_type_mapping_contribution_one_check"
CHECK ("contribution" = 1.0);
