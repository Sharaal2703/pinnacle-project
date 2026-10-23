# Pre-assessment questionnaire files

Versioned JSON files in this directory are the canonical questionnaire bank inputs. Keep the selected source material in `selected/` and mapping/review drafts in `analysis/`. Do not overwrite a questionnaire version already used by an assessment attempt; create a new version instead.

## Active question-bank shape

The updated MindBridge requirements specify 40 items for Grades 6–8:

- 24 self-report statements: three for each of the eight MI pathways.
- 16 scenario questions: four preference options per question.

Use the pathway codes from the updated Design Documentation:

| Code | Pathway |
|---|---|
| `LING` | Linguistic |
| `LOGI` | Logical-Mathematical |
| `VIS` | Spatial/Visual |
| `MUSIC` | Musical |
| `BODY` | Bodily-Kinesthetic |
| `NAT` | Naturalistic |
| `INTER` | Interpersonal |
| `INTRA` | Intrapersonal |

## File shape

Each file contains `questionnaire_id`, `language_code`, `version`, `grade_min`, `grade_max`, `session_time_limit_seconds`, `rating_labels`, `scoring_notes`, `sources`, `review`, and `items`.

Every item has a stable `key`, `type` (`SELF_REPORT` or `SCENARIO`), `prompt`, `weight`, `time_limit_seconds`, and a `source_id` referring to the top-level source catalog.

- Self-report items have `pathway_code`, `rating_scale` (`[1, 2, 3, 4, 5]`), and `source_item_number`.
- Scenario items have four `options`. Each option has a stable `key`, student-facing `label`, a `vark_type` (`V`, `A`, `R`, or `K`) retained as separate source-analysis metadata, and `pathway_contributions` containing MI pathway codes and numeric contribution values from 0 to 1.

The current selected bank assigns a 45-second per-item limit to self-report and a 75-second limit to scenarios. With 24 and 16 items respectively, these limits sum to 2,280 seconds (38 minutes). The server should measure answer time. VARK labels do not affect MI scores; response time is used only as the documented tie-breaker and does not change normalized scores.

## Scoring and review status

Self-report response factor is `(rating - 1) / 4`. In `pre-assessment-v2-en.json`, each scenario option's contribution is split equally over its proposed MI mappings. These weights are provisional and must be reviewed before the bank is approved.

Questionnaire `review` metadata is informational only. Files must be imported as `DRAFT` and inactive; the file metadata does not authorize student use. An authorized reviewer must approve the question versions in the application before activation. The current file preserves selected source wording and proposed VARK-to-MI mappings; confirm reuse permissions or rewrite wording as needed before publication. Pilot-test the questions with the target grades and do not describe the resulting profile as a validated intelligence diagnosis.

The existing `pre-assessment-v1-en.json` is a legacy six-pathway, 18-item bank. The revised pathway codes and 40-item bank require corresponding backend/shared-schema updates before `pre-assessment-v2-en.json` can be imported by the application.
