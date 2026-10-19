-- The former seed process treated self-declared JSON review metadata as approval.
-- Revoke that approval for the shipped sample bank so only an in-app review can publish it.
UPDATE "question_versions"
SET
    "reviewStatus" = 'DRAFT',
    "reviewerName" = NULL,
    "reviewNotes" = NULL,
    "reviewedAt" = NULL,
    "isActive" = false
WHERE "reviewerName" = 'Middle School Curriculum Review Panel'
  AND "key" IN (
    'SR_LING', 'SR_LOGI', 'SR_SPAT', 'SR_MUSI', 'SR_BODY', 'SR_NATU',
    'SC_01', 'SC_02', 'SC_03', 'SC_04', 'SC_05', 'SC_06',
    'SC_07', 'SC_08', 'SC_09', 'SC_10', 'SC_11', 'SC_12'
  );
