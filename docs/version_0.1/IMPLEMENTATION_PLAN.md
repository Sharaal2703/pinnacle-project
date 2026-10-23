# Pre-Assessment implementation plan

## Goal

Build only the first MindBridge Pre-Assessment module. Deliver student authentication, a versioned six-pathway questionnaire, server-timed attempts, preference scoring, and a student profile/history view. Do not build curriculum learning, academic quizzes, learning gain, adaptation, teacher reports, observations, or objective tasks in this phase.

Use `PRE_ASSESSMENT_CONTRACT.md` as the binding API, data, scoring, security, and ownership specification. `WORK_SPLIT.md` assigns code ownership. Use fictional demo data until school approval and the questionnaire wording/review are ready.

## Build sequence

### 1. Shared foundation

**Developer 1 leads; both review.** Scaffold npm workspaces for React/TypeScript (`frontend/`), Express/TypeScript (`backend/`), and shared Zod schemas/types (`shared/`). Set the Node LTS runtime, PostgreSQL connection through backend environment configuration, Prisma schema/migration workflow, config loading, common error response, and OpenAPI generation. Each developer uses a separate development database. Consider a restricted cloud staging database only when integration/deployment needs it; use fictional data. Create the pathway and role enums and the API client boundary. See `DATABASE_SETUP.md`.

**Exit:** both developers can run the app against their development databases; generated OpenAPI/types match shared schemas; no credentials are committed.

### 2. Identity and question bank

**Developer 1:** implement student registration/login/current-user, password hashing, token middleware, role/ownership checks, pathway seed rows, versioned question/config models, and admin CRUD APIs. Explicit seeding imports question content as drafts only; it never creates accounts, approves content from file metadata, or runs on API startup.

**Developer 2:** implement registration/login screens, assessment instructions, and admin question/config screens against the agreed API types. Read actual questionnaire wording from reviewed files in `docs/questionnaires/`; do not write final prompts independently.

**Exit:** a student can authenticate; an admin can create/deactivate question versions and configuration; active attempts can retain the exact question versions they started with.

### 3. Attempt session and timer

**Developer 1:** implement start/resume, fixed question order, `shown_at`, per-question and total server deadlines, response persistence, timeout advancement, duplicate/stale/order validation, and submit state.

**Developer 2:** implement self-report/scenario rendering, answer controls, progress, timers from API values, reconnect/refresh behavior, and submit/timeout messaging.

**Exit:** refresh does not reset a timer; the browser cannot change time or skip questions; timeout and retry states follow the contract.

### 4. Scoring and student profile

**Developer 1:** implement the preference-only scoring engine, minimum answer threshold, normalization, ties/near ties, immutable profile history, and transactional current-profile update.

**Developer 2:** implement the accessible result chart and equivalent text summary, profile history, retake flow, and no-profile/insufficient-answer screens.

**Exit:** frontend results match server-computed profile data; retakes preserve earlier profiles.

### 5. Integration and module acceptance

**Both developers:** integrate the vertical slice: register/login -> instructions -> start -> answer/resume -> submit/score -> profile -> retake. Verify API error handling, ownership, accessibility, and tablet/responsive behavior. Developer 1 sequences migrations and resolves schema merges.

**Exit:** all acceptance criteria below are demonstrable using fictional accounts, with no API or generated-type mismatch.

## Acceptance criteria

- Student registration creates a student account and routes to assessment when no current profile exists.
- Student can start/resume and complete the 18-item preference assessment; all answer and timer decisions are server-controlled.
- Self-report formula, scenario mapping, normalization, missing items, unavailable pathways, deterministic ties, near ties, and 15-of-18 threshold match the contract.
- A timed-out answer contributes zero and advances. The total deadline finalizes unanswered items when the server receives a subsequent request.
- A student cannot access another student's attempts or profiles; only admins can manage question versions/config.
- The result is labeled as an indicative learning-preference profile, includes six scores and text alternatives, and does not diagnose or claim fixed ability.
- Reassessment creates a new attempt/profile and keeps prior profile history intact.
- Only teacher-reviewed questionnaire versions can be activated for student use. No real student data is used before the school process is approved.

## Shared-change protocol

1. Developer 2 files an interface request with the UI use case and example request/response.
2. Developer 1 updates the Zod schema and generates OpenAPI/types.
3. Both review the generated interface change before either side integrates it.
4. Database migrations merge serially through Developer 1; never edit an already-applied migration.

