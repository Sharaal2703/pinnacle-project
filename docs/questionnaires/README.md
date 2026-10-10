# Pre-Assessment questionnaire files

Store versioned Pre-Assessment question banks in this folder. The JSON file is the canonical import/seed input; the admin UI and database store versioned copies of approved questions for active attempts.

## Naming

Use one file per questionnaire version and language, for example:

- `pre-assessment-v1-en.json`
- `pre-assessment-v1-ta.json` if Tamil is included in scope

Do not overwrite a version already used by an attempt. Add a new versioned file when wording, options, mappings, timing, or weights change.

## File shape

Each file contains `questionnaire_id`, `language_code`, `version`, `grade_min`, `grade_max`, `review`, and `items`.

Each item contains a stable `key`, `type` (`SELF_REPORT` or `SCENARIO`), `prompt`, `weight`, `time_limit_seconds`, and either:

- For `SELF_REPORT`: `pathway_code` and the fixed rating scale `[1, 2, 3, 4, 5]`.
- For `SCENARIO`: `options`, each with a stable `key`, student-visible `label`, and `pathway_contributions` list of `{ "pathway_code", "contribution" }` values from 0 to 1.

The questionnaire-level `review` records `status` (`DRAFT` or `APPROVED`), reviewer name, review date, and notes. Only `APPROVED` files can be loaded into the active question bank. The admin must record the teacher's review decision in the application when activating the bank.

The initial bank contains six self-report items (one per supported pathway) and twelve scenario items. Keep scenario option coverage balanced across all six pathways. The final prompts and mappings are pending teacher review and the user's questionnaire update; do not fill this folder with invented student-facing items.

Use original, age-appropriate wording. Do not copy textbook passages or external questionnaire wording. Preference questions need not quote curriculum content. Never store student answers, student names, or other personal data here.
