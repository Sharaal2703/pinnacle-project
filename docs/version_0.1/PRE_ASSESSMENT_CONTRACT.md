# Pre-Assessment module developer contract

**Purpose:** This document is the shared implementation contract for the first MindBridge module. It defines what the two developers may build independently, the interfaces they share, and the assessment rules both sides must implement. It is scoped to account access needed by Pre-Assessment, questionnaire delivery, timing, scoring, and profile display. Curriculum learning, academic quizzes, adaptation, reports, teacher observations, and objective tasks are deferred.

**Authority:** Follow the SRS v1.1 for product requirements and this module contract for implementation details. The HLD/LLD applies where consistent with the SRS. Where those documents conflict, use the resolutions below. The app-wide `DEVELOPER_CONTRACT.md` remains a future-system reference; this module contract governs the current phase.

## 1. Module boundary

### In scope

- Student registration and login sufficient to protect an assessment attempt.
- Admin-only question-bank/configuration management, plus versioned seed loading.
- An 18-item preference questionnaire: six self-report items (one per pathway) and twelve scenario items with balanced pathway options.
- Start/resume, server-timed delivery, response persistence, timeout/submit, profile scoring, current profile, and profile history.
- Student instruction, question, progress/timer, result, and retake screens.
- Six fixed pathways only: `LING` Linguistic, `LOGI` Logical-Mathematical, `SPAT` Spatial/Visual, `MUSI` Musical, `BODY` Bodily-Kinesthetic, `NATU` Naturalistic.

### Deferred

Curriculum browsing/resources, baseline/post academic quizzes, learning gain/mastery/adaptation, class/teacher reports, parent access, teacher/parent observations, Interpersonal/Intrapersonal pathways, and objective task questions. Do not create their routes, tables, or UI in this phase unless a shared foundation strictly needs a placeholder.

Question prompts and final scenario mappings must come from reviewed questionnaire files in `docs/questionnaires/`. Use one JSON file per questionnaire version/language, as specified in that folder's README. Developers build the data model and rendering from the contract; they must not invent final student-facing questionnaire content. The importer creates draft/inactive versions regardless of file review metadata; an authorized admin must record the actual external review and activate the version in the app. The six pathway self-report items and twelve scenarios are the initial bank shape, not proof that the instrument is validated.

## 2. Stack and code ownership

- Frontend: React + TypeScript.
- Backend: Node.js + TypeScript + Express, as a modular monolith.
- Database: PostgreSQL with Prisma and versioned migrations.
- Development database: PostgreSQL configured through `backend/.env`; each developer uses an independent database where possible. See `DATABASE_SETUP.md`.
- Workspace: npm workspaces: `frontend/`, `backend/`, `shared/`.
- Shared interfaces: Zod schemas in `shared/`; generate OpenAPI and TypeScript client types from those schemas. `shared/` is owned by Developer 1. Developer 2 requests changes there instead of creating parallel DTOs.
- API prefix: `/api/v1`; JSON properties use `snake_case`; IDs are UUIDs; timestamps are UTC ISO-8601.

### Developer 1 - Backend and assessment rules

Own `backend/`, `shared/`, database schema/migrations, auth middleware, question-bank/config APIs, attempt/session endpoints, server timer, scoring/profile services, seed loader, and API-level verification. Sequence and merge every database migration.

### Developer 2 - Frontend and questionnaire experience

Own `frontend/`: registration/login screens, instructions, accessible self-report/scenario renderer, progress and timer display, submit/retake flow, result chart and text summary, profile history view, and browser-level verification. Consume only the shared generated API types and documented endpoints. Do not edit `backend/`, `shared/`, or migrations directly.

### Shared-file rule

Developer 1 proposes and updates a shared schema or endpoint only after a written change request from Developer 2 that includes the user flow and example payload. Both developers review the generated OpenAPI diff before integration. No simultaneous edits to the same shared or migration file.

## 3. Data contract

Only create entities needed for this module:

- `User`: UUID, name, username, password hash, role (`STUDENT` or `ADMIN` for this phase), active flag, created timestamp. Public registration always creates `STUDENT`; admin is seeded/provisioned.
- `Student`: UUID, unique user ID, grade constrained to 6-8.
- `Pathway`: fixed seeded code/name rows for the six codes above; no API to add pathways.
- `QuestionVersion`: UUID, stable question key, version, type (`SELF_REPORT` or `SCENARIO`), prompt, grade band, question weight, time limit, review status (`DRAFT`, `APPROVED`, `REJECTED`), reviewer name/notes/time, active flag. An approved/published version is immutable.
- `QuestionOption`: UUID, question-version ID, label/order, one or more pathway contribution mappings. Scenario options have no correct/incorrect state.
- `AssessmentAttempt`: UUID, student ID, status (`IN_PROGRESS`, `SCORED`, `INCOMPLETE`), attempt number, fixed ordered list of question-version IDs, current index, started/submitted timestamps, scoring/config version.
- `AssessmentResponse`: UUID, attempt ID, question-version ID, optional option ID, typed answer JSON, server `shown_at`/`answered_at`, elapsed milliseconds, timed-out flag. Unique `(attempt_id, question_version_id)`.
- `PreferenceProfile`: UUID, student ID, attempt ID, created timestamp, current flag, primary/secondary pathway IDs, near-tie flag, scoring version.
- `PreferenceScore`: profile ID + pathway ID, raw score, maximum possible score, normalized 0-100 score (nullable when unavailable), rank.
- `AssessmentConfig`: versioned total limit, per-type limit, grace period, minimum answered count, near-tie margin, question weights, and scoring formula version.

Keep old question versions, attempts, responses, and profiles. A retake creates a new attempt/profile; update the student's previous-current flag and new-current profile in one transaction. Enforce one response per item and one current profile per student with database constraints/transactions.

## 4. Shared API contract

Every success response is JSON. Errors use:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The rating must be between 1 and 5.",
    "details": [{ "field": "answer.rating", "issue": "out_of_range" }]
  }
}
```

| Method and path | Role | Behavior |
|---|---|---|
| `POST /auth/register` | Public | Create student account; accept name, username, password, grade; return token and user summary. |
| `POST /auth/login` | Public | Verify credentials; return token and user summary. |
| `GET /auth/me` | Student/Admin | Return current identity and role. |
| `POST /assessment-attempts` | Student | Resume the active attempt if within its deadline; otherwise finalize it and create a new numbered attempt. |
| `GET /assessment-attempts/{attempt_id}/current` | Owning student | Return the current safe question and server-derived timers. Re-reading does not reset `shown_at`. |
| `POST /assessment-attempts/{attempt_id}/responses` | Owning student | Save the current answer once; server ignores client timing and advances index. |
| `POST /assessment-attempts/{attempt_id}/submit` | Owning student | Submit only when all items have a response or timeout record; score atomically or return incomplete outcome. |
| `GET /students/me/preference-profile` | Student | Return current profile; return `404 PROFILE_NOT_FOUND` if no profile exists. |
| `GET /students/me/preference-profiles` | Student | Return own profile history, newest first. |
| `GET /admin/questions` | Admin | List question versions and review/config status. |
| `POST /admin/questions` | Admin | Create a draft question version. |
| `PUT /admin/questions/{question_id}` | Admin | Create a new version; never mutate a version referenced by an attempt. |
| `POST /admin/questions/{question_id}/review` | Admin | Record an external teacher review decision (`APPROVED` or `REJECTED`), reviewer name, notes, and review time. |
| `POST /admin/questions/{question_id}/activate` | Admin | Activate an approved version for future attempts. |
| `DELETE /admin/questions/{question_id}` | Admin | Deactivate question for future attempts; preserve historical versions. |
| `GET /admin/assessment-config` | Admin | Read active configuration. |
| `PUT /admin/assessment-config` | Admin | Validate and version configuration changes; audit actor and time. |

Safe current-question response:

```json
{
  "attempt_id": "uuid",
  "question_id": "uuid",
  "index": 1,
  "total": 18,
  "type": "SELF_REPORT",
  "prompt": "Question text comes from the reviewed questionnaire bank.",
  "rating_scale": [1, 2, 3, 4, 5],
  "options": [],
  "time_limit_seconds": 60,
  "question_remaining_seconds": 52,
  "assessment_remaining_seconds": 1420
}
```

For a scenario, return `options: [{ "id", "label" }]`; do not return pathway mappings. Self-report answer is `{ "question_id", "answer": { "rating": 1..5 } }`. Scenario answer is `{ "question_id", "answer": { "option_id" } }`. Submit response includes six pathway rows `{ "pathway_code", "score_0_100", "available", "rank" }` and `{ "primary", "secondary", "near_tie", "scoring_version" }`. A score with no denominator is `null` and `available=false`.

Return `400` for invalid input/state, `401` for missing/expired token, `403` for wrong role/ownership, `404` for unavailable resources, `409` for duplicate or stale response, and `500` for unexpected errors. Do not reveal another student's record. A browser logout clears the in-memory token; access tokens expire after two hours. No refresh token or token revocation list is in this phase.

## 5. Assessment behavior

### Question bank and selection

- Initial set: six self-report items, one targeting each pathway; twelve scenarios with four options each and balanced opportunity for every pathway to be selected.
- Every response option maps to at least one supported pathway with a contribution from 0 to 1. Scenario options are preference choices, never right/wrong answers.
- Question weight defaults to 1.0 and is configurable from 1.0 to 3.0. Keep the 18 question-version IDs and order fixed on the attempt.
- Only active question versions with a recorded `APPROVED` teacher review are served. The admin records a review performed outside the app; until reviewed questionnaire files are supplied, use test fixtures only and show no fabricated real questionnaire prompts in the student build.

### Timing and attempt state

- Total limit: 25 minutes from `started_at`; self-report limit: 60 seconds; scenario limit: 90 seconds; server-side grace: 2 seconds. Store all as versioned configuration. An attempt uses the immutable config version captured when it starts, including for timeout and scoring decisions.
- Time continues during refresh, tab close, or network loss. The client timer is display only. Server timestamps decide whether a response is on time.
- A question's first display sets `shown_at`. Returning to the current question preserves it. After per-question limit plus grace, persist a timeout with zero contribution and advance.
- The student cannot skip ahead or submit early with unanswered items. When a request arrives after the total deadline, persist remaining items as timed out and finalize the attempt, issuing a profile when the minimum answered threshold is met. Starting a retake first finalizes an expired in-progress attempt. No background timer worker is required.
- At least 15 non-timeout answers are required to issue a profile. Below threshold, mark `INCOMPLETE`, save the attempt/responses, return a retake prompt, and do not create a current profile.
- Retaking always creates a new attempt. The latest successfully scored profile becomes current; earlier profiles remain readable as history.

### Scoring

- Self-report response contribution: `rw = (rating - 1) / 4`; rating must be an integer 1-5.
- Scenario contribution: use the selected option's configured pathway contribution. Do not use correctness or response time.
- For pathway `k`: `raw[k] = sum(question_weight * rw[k])`; `max[k] = sum(question_weight * max_possible_rw[k] for each item where k is selectable)`; `score[k] = 100 * raw[k] / max[k]`.
- Timed-out/missing answers contribute zero; the maximum denominator does not shrink. If `max[k] == 0`, return unavailable/null.
- Rank normalized scores descending. Exact ties use pathway order `LING`, `LOGI`, `SPAT`, `MUSI`, `BODY`, `NATU`. If top two scores differ by five points or less, set `near_tie=true` and use “similar preferences” or “blended preferences” wording.
- Do not include response-time penalty, objective task correctness, academic test scores, or observations in preference scoring.

## 6. Security, privacy, and UI rules

- Hash passwords with bcrypt; validate all inputs server-side; use parameterized database access through Prisma.
- API startup never provisions users. Use the explicit one-time admin provisioning command; never use a shared or hard-coded admin password outside local development.
- Student endpoints derive student identity from the authenticated user; never trust a student ID supplied by the browser for self-service routes.
- Keep the access token in frontend memory, not local storage. Require HTTPS outside local development.
- Do not use real student data until school approval, consent, retention, deletion, and backup rules are established. Use fictional seed accounts and responses.
- Use age-appropriate text supplied through reviewed questionnaire files. Results say “learning preference,” never “intelligence diagnosis” or a fixed ability label.
- Chart must include pathway names and numeric text values, work without color alone, and support keyboard navigation and responsive tablet layout.

## 7. Definition of done

- Student can register/login, start and resume an attempt, answer all question types in the approved bank, and see a profile or an insufficient-answer retake result.
- Server controls timers and ownership; refresh does not reset time; timeout, duplicate, stale, invalid, and out-of-order submissions are handled as specified.
- Scores match the formula for representative self-report/scenario data, including missing responses, zero denominator, exact tie, near tie, and retake.
- Admin can create/version questions, record teacher review, activate/deactivate approved items, and update validated configuration without rewriting existing attempts.
- Frontend and backend use the shared Zod/OpenAPI contract; no duplicate hand-maintained DTO shape exists.
- Questionnaire content has a stable version and reviewer status before it is student-visible.
- No learning, post-assessment, adaptation, reports, or observation feature is included in this phase.

