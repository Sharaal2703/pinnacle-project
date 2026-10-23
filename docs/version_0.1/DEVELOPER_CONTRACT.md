# MindBridge developer contract

**Purpose:** This is the shared implementation boundary for the two developers building the MindBridge MVP. It turns the SRS and the Pre-Assessment HLD/LLD into decisions that can be implemented and integrated without competing definitions of scope, data, scoring, or API behavior.

**Authority:** The MindBridge SRS v1.1 (10 October 2026) is the product scope authority. The HLD/LLD is the detailed reference for Pre-Assessment only. Where they conflict, this contract records the resolution. The implementation stack is selected: React/TypeScript, Node.js/TypeScript with Express, and PostgreSQL. Remaining pilot and school decisions are tracked in `DECISIONS_AND_OPEN_ISSUES.md`. Change this file before changing a shared contract in code.

> **Current delivery scope:** Build only the Pre-Assessment module. Use `PRE_ASSESSMENT_CONTRACT.md`, `IMPLEMENTATION_PLAN.md`, and `WORK_SPLIT.md` as the active implementation documents. The broader modules described below are future-system context and are deferred from this phase.

## 1. Product and MVP boundary

Build a responsive web application for Classes 6-8 with three connected capabilities:

1. Create an indicative learning-preference profile across the six supported pathways.
2. Present teacher-approved curriculum concepts through pathway-tagged resources.
3. Run comparable concept baseline and post-assessments, track completion and engagement, calculate learning gain and mastery, and record any secondary/blended-pathway recommendation.

The profile is a preference summary, not a diagnosis or a claim that one format is universally best for a student. Quiz performance is academic evidence and must never be blended into preference scores. The initial release supports Student, Teacher, and Administrator roles. Parent access, Interpersonal and Intrapersonal pathways, native mobile apps, payments, live video, and AI publishing are outside this MVP.

Use Tamil Nadu Government school textbooks for Grades 6-8 as the curriculum source. Use the [user-provided Tamil Nadu school books index](https://www.tntextbooks.in/p/school-books.html) to locate grade books. Treat it as an index: verify each selected PDF's Government of Tamil Nadu/SCERT publisher and edition/year, and record that source metadata with the curriculum content. The textbook edition, medium, and exact grade/subject/chapter/concept selection must be supplied before curriculum seed content is authored. Start with a small, complete, teacher-reviewed sample curriculum. A concept's objective and core facts must remain the same across pathway representations; the resource format can change.

## 2. Decisions that resolve source conflicts

| Topic | Contract decision | Source conflict or rationale |
|---|---|---|
| Supported pathways | Exactly Linguistic, Logical-Mathematical, Spatial/Visual, Musical, Bodily-Kinesthetic, Naturalistic. Use codes `LING`, `LOGI`, `SPAT`, `MUSI`, `BODY`, `NATU`. | SRS excludes Interpersonal and Intrapersonal; HLD scenario examples include both. Replace those options with supported pathways before seeding questions. |
| Assessment length | Use an initial 25-minute total deadline, 60 seconds per self-report question, and 90 seconds per scenario question. The clock runs continuously from attempt start; a two-second network grace applies. Keep values configurable and pilot them. | SRS gives a 20-30 minute target; HLD's 15 minutes/900 seconds is provisional. |
| Question bank | Initial MVP: 18 preference items - six self-report (one per pathway) and twelve scenarios with balanced selectable pathway coverage. Objective tasks are deferred. Keep bank content/configuration data-driven. | HLD gives inconsistent mixes (6/8/6 and 8/4/8) and includes tasks that do not contribute to preference. This preference-only set is simpler and consistent with the SRS. |
| Preference scoring | Only self-report and scenario preference contributions are scored. Objective task correctness, response time, teacher/parent observations, and academic quiz scores are separate records and do not change preference scores. | HLD's prose says no time penalty and separate observations, while its formula later applies a time penalty and blends observations. SRS's preference formula and separation rules govern. |
| Normalization | For pathway `k`, `raw[k] = sum(question_weight * contribution[k])`; `max[k] = sum(question_weight * highest possible contribution[k] for each eligible preference item)`; `score[k] = 100 * raw[k] / max[k]`. Return `null` and `available=false` if `max[k]` is zero. Do not infer a zero score from missing coverage. | SRS defines a 0-100 normalized score. HLD also describes a relative-to-top profile value; that is not the canonical score. |
| Missing answers | Persist timed-out/missing items as unanswered with zero contribution; keep the maximum denominator unchanged. Require at least 15 of 18 answers to issue a profile; keep the threshold configurable. | SRS requires safe handling but leaves the threshold open; the 15-of-18 default is the implementation choice for the selected 18-item bank. |
| Ranking and ties | Rank available 0-100 scores descending; for exact ties use fixed pathway code order above. Use a configurable 5-point near-tie margin. Label close top scores “similar preferences” or “blended”; never claim the ordering proves a true preference. | Combines SRS's deterministic tie requirement with a concrete provisional margin for the MVP. |
| Learning gain | `gain = (post - pre) / (100 - pre)` when comparable scores exist and `pre < 100`; keep negative values. If `pre = 100`, mark normalized gain not applicable and show raw change. Mastery is a separate configurable threshold/rubric. | SRS definition. |
| Architecture | Modular monolith with one REST API and one relational database. No module-to-module HTTP calls inside the server. | Keeps the two-person MVP small while preserving module ownership boundaries. |

## 3. Technical baseline

Use this baseline for implementation:

- **Frontend:** React + TypeScript, responsive web UI.
- **Backend:** Node.js + TypeScript + Express, REST/JSON, organized as a modular monolith with presentation, API/controller, service, and data layers.
- **Runtime validation and API documentation:** define request/response schemas with Zod; generate the OpenAPI document and inferred TypeScript types from those schemas. The generated client types are shared by the frontend and backend; do not hand-maintain duplicate DTO definitions.
- **Database:** PostgreSQL with Prisma ORM and reviewed migrations. Migrations are the only way to change schema.
- **Architecture:** modular monolith, separated into `auth`, `assessment`, `curriculum`, `learning`, `quiz`, `progress`, and `reporting` modules. Modules call service interfaces, not each other's repositories.
- **Media:** local filesystem for development, with media metadata and access rules in PostgreSQL; deployment storage can be selected later behind a storage interface.
- **Workspace:** npm workspaces with `frontend/`, `backend/`, and `shared/` packages. Keep shared Zod schemas in `shared/` and database schema/migrations in `backend/`.
- **API root:** `/api/v1`.
- **Identifiers:** UUIDs for externally visible entities. Database and API timestamps are UTC ISO-8601.
- **API naming:** JSON `snake_case` fields; enum values are uppercase strings. Frontend may map to camelCase internally.
- **Authentication:** short-lived signed access token (2 hours provisional), sent as a Bearer token; keep it in memory in the browser, not local storage. Every protected route enforces role and resource ownership on the server.

Pin the Node.js LTS version and all dependency versions in the runtime file and npm lockfile during project setup. Keep configuration and secrets out of source control. Development may use seeded demo users and fictional student data only. Do not onboard real student data until school consent, retention, deletion, and backup/restore procedures are agreed.

## 4. Shared domain contract

### Core entities

- `User`: id, name, username/email, password hash, role (`STUDENT`, `TEACHER`, `ADMIN`), active flag.
- `Student`: user id, grade (6-8), optional class membership.
- `TeacherAssignment`: teacher id to class id. Teachers may access only assigned students/classes.
- `Pathway`: one of the six fixed pathway codes. Seed once; do not let admins create new pathways.
- `AssessmentQuestion` and `QuestionOption`: question type, grade band, weight, timing/configuration, active/version state; options map to one or more pathways with contribution weights. Scenario options are preferences, not right/wrong answers.
- `AssessmentAttempt` and `AssessmentResponse`: attempt status, ordered question IDs, current index, server timestamps, answers, elapsed time, timeout state. Unique response per attempt/question.
- `PreferenceProfile` and `PreferenceScore`: immutable profile snapshot per completed attempt; six pathway score rows where available; primary/secondary pathway, near-tie flag, scoring version, and current-profile flag. Retakes create new rows and retain history.
- `School`, `Class`, `Subject`, `Chapter`, `Concept`: curriculum hierarchy.
- `LearningResource`, `ResourceVersion`, `ResourceReview`: concept/pathway/format/language tags and draft/review/approved/published/rejected/archive state. Only approved and published versions are student-visible.
- `Quiz`, `QuizQuestion`, `QuizAttempt`, `QuizResponse`: concept, quiz version, baseline/post role, learning-objective coverage, answer key on server only, score, attempts, and timestamps.
- `ProgressRecord` and `PathwayEvent`: concept status, resource version and pathway used, profile snapshot used, completion, recommendation, override actor/reason, and event time.
- `ClassTestScore`, `StudentFeedback`, `Observation`: supplementary records stored separately from preference and quiz scoring. Observation collection remains disabled until access/consent is approved.

### Data invariants

1. A student can read and mutate only their own student records; a teacher can read assigned students; administrators use explicit admin routes.
2. One current preference profile per student. Updating current status and inserting a new profile is one transaction.
3. Profile, quiz, resource version, and pathway history are append-preserving. Do not rewrite old learning evidence when the student's profile or content changes.
4. Baseline and post scores are comparable only when they are linked to the same concept, aligned learning objectives, and declared comparable quiz versions.
5. Store objective task correctness, elapsed time, classroom marks, feedback, and observer ratings in separate fields/tables. No implicit joins into the preference formula.
6. Never return answer keys, hidden correct answers, or private pathway mappings in student question payloads.
7. Use foreign keys, check constraints for grades/scores/ranges, unique constraints for one response per question attempt, and transactions for submit/score/profile operations.

## 5. API contract

All requests and responses use JSON. Success responses are resource-shaped JSON. Errors use:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The rating must be between 1 and 5.",
    "details": [{ "field": "answer.rating", "issue": "out_of_range" }]
  }
}
```

Use HTTP `400` for invalid state/input, `401` for missing/expired auth, `403` for role/ownership denial, `404` for an unavailable resource, `409` for duplicate or conflicting state, and `500` for unexpected server failures. Do not disclose another student's record existence in authorization errors. All writes that can be retried should be idempotent where practical; duplicate assessment answers return `409` and do not overwrite the first answer.

### Authentication and identity

| Method and path | Purpose |
|---|---|
| `POST /auth/register` | Create student and user; return user identity and token. |
| `POST /auth/login` | Authenticate; return user identity and token. |
| `GET /auth/me` | Return authenticated user and permitted student/teacher context. |
| `POST /auth/logout` | Invalidate client session/token where supported. |

Registration payload is `{ "name", "username", "password", "grade" }`. Registration creates only a student account. Admins provision teacher/admin roles; public registration cannot set a role.

### Pre-assessment and profile

| Method and path | Purpose |
|---|---|
| `POST /assessment-attempts` | Start or resume the current in-progress attempt. |
| `GET /assessment-attempts/{attempt_id}/current` | Return current safe-to-display question, index/count, server-derived remaining times. Refresh does not reset `shown_at`. |
| `POST /assessment-attempts/{attempt_id}/responses` | Save the current question response once. Client-supplied elapsed time is ignored. |
| `POST /assessment-attempts/{attempt_id}/submit` | Validate completion/threshold, score atomically, save immutable profile, return result. Total timeout auto-submits. |
| `GET /students/{student_id}/preference-profile` | Return current profile to student, authorized teacher, or internal learning service. |
| `GET /students/{student_id}/preference-profiles` | Return history to the student or authorized teacher. |

Safe question payload shape:

```json
{
  "attempt_id": "uuid",
  "question_id": "uuid",
  "index": 1,
  "total": 20,
  "type": "SELF_REPORT",
  "prompt": "I enjoy learning a new idea through an explanation.",
  "options": [{ "id": "uuid", "label": "Not at all like me" }],
  "time_limit_seconds": 60,
  "question_remaining_seconds": 52,
  "assessment_remaining_seconds": 1420
}
```

Answer shape is `{ "question_id": "uuid", "answer": { "rating": 4 } }` for self-report, `{ "question_id": "uuid", "answer": { "option_id": "uuid" } }` for a scenario, or a task-specific JSON answer for an optional objective task. Submit result returns six entries `{ "pathway_code", "score_0_100", "available", "rank" }`, plus `{ "primary", "secondary", "near_tie", "scoring_version" }`. Unavailable scores are `null`, not zero.

Server time controls assessment duration and per-question limits. A displayed timer is advisory. The total clock runs continuously from `started_at`, including disconnects. A question already shown is returned with the same start timestamp after refresh. A timeout is persisted and advances the attempt; allow two seconds of server-side grace for network delay. When a request arrives after the total deadline, finalize unanswered items as timed out and submit the attempt. Configure the minimum answered count, question limits, total limit, near-tie margin, and mastery/adaptation thresholds; never implement them as frontend constants.

### Curriculum, resources, learning and evidence

| Method and path | Purpose |
|---|---|
| `GET /curriculum/grades/{grade}/subjects` | Browse a student's grade curriculum. |
| `GET /subjects/{subject_id}/chapters` | Browse chapters. |
| `GET /chapters/{chapter_id}/concepts` | Browse concepts. |
| `GET /concepts/{concept_id}` | Return objective and curriculum metadata. |
| `GET /concepts/{concept_id}/resources?pathway_code=LING` | List approved/published resources for a pathway; default recommendation uses current primary profile. |
| `POST /concepts/{concept_id}/progress` | Start/resume concept and capture profile/resource version used. |
| `PATCH /concepts/{concept_id}/progress` | Save progress/status and engagement events. |
| `POST /concepts/{concept_id}/quiz-attempts` | Start baseline or post quiz (`kind` required); server selects the eligible version and never sends answer keys. |
| `POST /quiz-attempts/{attempt_id}/responses` | Save one quiz response. |
| `POST /quiz-attempts/{attempt_id}/submit` | Score and persist attempt. |
| `GET /students/{student_id}/progress` | Student's own progress or authorized teacher view. |
| `GET /classes/{class_id}/reports` | Teacher report for an assigned class. |

Quiz result includes raw and 0-100 scores, attempt number, quiz/version, concept, kind, and timestamps. When comparable baseline/post evidence exists, return raw change and normalized learning gain; when baseline is 100, `normalized_gain` is `null` with an explanatory status. Mastery is returned separately. Adaptation is a recommendation only after checking completion, engagement/time, quiz alignment, attempts, and configured thresholds. A student/teacher override is recorded with actor and reason; no automatic switch after one poor score.

### Content and administration

| Method and path | Purpose |
|---|---|
| `POST /admin/resources` / `PATCH /admin/resources/{id}` | Create/edit draft metadata and versions. |
| `POST /admin/resources/{id}/submit-review` | Move a draft to pending review. |
| `POST /admin/resources/{id}/review` | Approve, reject, or request revision; record reviewer, time, decision, and version. |
| `POST /admin/resources/{id}/publish` | Publish only an approved version. |
| `POST /admin/questions` / `PATCH /admin/questions/{id}` | Manage assessment bank and pathway mappings. Preserve old attempts' question/version snapshots. |
| `GET /admin/config` / `PATCH /admin/config` | Read/update validated scoring and timing configuration; audit changes. |
| `POST /teacher/classes/{class_id}/class-test-scores` | Record class-test evidence for assigned students. |

### First vertical slice

The first integrated slice is: student registration/login -> assessment start/resume -> answer and score -> profile -> browse one concept -> serve approved resource -> baseline quiz -> learning progress -> post quiz -> gain/mastery result. Build both modules against the API shapes above with seeded demo data before expanding content.

## 6. Shared repository and change rules

- Keep module code in separate frontend and backend module folders. Shared UI, auth, API client, common domain types, settings, and database migration infrastructure have one owner (Developer 1, per `WORK_SPLIT.md`).
- Each module owns its service, routes, DTO/schema, repository, and module tests. Do not edit another developer's module internals; request a contract change or expose a service interface.
- All database changes are migration-only. Developer 1 sequences/merges migrations; Developer 2 supplies learning-domain migration files and model changes in their feature branch, based on the latest shared migration. Never both modify the same migration or generated schema file.
- Commit in small feature branches; merge through review. Each PR states API/schema changes, migration impact, and manual verification. Do not commit secrets, student data, generated media, or unrelated formatting changes.
- No hidden behavior in the UI: backend is authoritative for authorization, timing, scoring, approval state, and mastery/adaptation configuration.
- Before changing a shared route, enum, response shape, formula, or entity, update this contract and the shared type/schema first, then update both producer and consumer in the same integration window.

## 7. Definition of done for an integrated feature

- The feature meets the relevant SRS behavior and role boundary.
- Request/response shapes and error cases match this contract.
- State and derived results persist with constraints and migration history.
- Student-facing content is age-appropriate, accessible, and does not expose answer keys or unapproved resources.
- Preference, objective performance, academic results, and engagement remain separate.
- Refresh/retry behavior does not lose or duplicate a submission.
- Include tests for the feature's normal flow, boundary conditions, and authorization. Verify the end-to-end slice manually in the demo environment.

