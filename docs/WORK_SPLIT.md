# Pre-Assessment two developer work split

This split applies to the current phase only: the Pre-Assessment module. The module contract in `PRE_ASSESSMENT_CONTRACT.md` defines the API, data, scoring, timing, and security behavior. All later learning modules are deferred.

## Ownership

| Owner | Owns | Boundary |
|---|---|---|
| **Developer 1 - Backend and shared contract** | `backend/`, `shared/`, Prisma schema/migrations, Express routes, auth middleware, question/config APIs, assessment attempts/responses, server timers, scoring/profile services, seed loader, generated OpenAPI/types. | Sole editor of shared Zod schemas and database migrations. Reviews requests for interface changes before updating generated contracts. |
| **Developer 2 - Frontend and questionnaire experience** | `frontend/`: registration/login, instructions, self-report/scenario renderer, progress/timers, submit/timeout/retake, result chart/text, profile history, admin question/config UI, frontend integration verification. | Consumes generated shared types. Does not edit backend routes/models, shared schemas, or Prisma migrations directly. |

Both developers review the shared contract before merging a change that affects request/response behavior. Developer 2's interface requests must include the UI use case and example payload; Developer 1 updates the shared Zod schema and regenerates OpenAPI/types.

## Work packages

### Developer 1

1. Scaffold the Node.js/TypeScript Express backend and npm workspace; configure PostgreSQL, Prisma, environment config, and shared errors.
2. Implement student registration/login/current-user and server-side role/ownership enforcement. Provide seeded demo users only.
3. Implement fixed pathways, versioned self-report/scenario question bank, admin CRUD/config APIs, and a seed loader for reviewed questionnaire files.
4. Implement attempt start/resume, fixed question order, server timestamps, 25-minute total limit, per-type limits, grace, timeout and duplicate handling.
5. Implement preference-only scoring, 15-of-18 threshold, normalized scores, tie/near-tie behavior, immutable profile history, and current-profile transaction.
6. Provide documented APIs and generated types early; keep migrations serial and provide a demo account/profile for UI integration.

### Developer 2

1. Scaffold React/TypeScript frontend using the workspace and generated API types; do not create parallel request/response types.
2. Build registration/login and age-appropriate assessment instructions.
3. Build self-report and scenario question screens from the safe current-question response; never display pathway mappings or hidden admin data.
4. Build progress/timer displays from server time, reconnect/refresh handling, timeout states, and submission flow.
5. Build result chart with numeric/text alternative, near-tie wording, insufficient-answer outcome, history, and retake flow.
6. Build the admin question/config screens against Developer 1's APIs; load only approved/reviewed questionnaire content from `docs/questionnaires/`.

## Integration checkpoints

| Checkpoint | Developer 1 | Developer 2 | Exit condition |
|---|---|---|---|
| **A. Workspace and DTOs** | Backend skeleton, DB connection, Zod schemas, OpenAPI generation. | Frontend skeleton and API client using generated types. | Both apps start; request/response types are generated from one shared schema. |
| **B. Auth and question bank** | Student auth, question/config models and APIs, seed mechanism. | Auth/instruction views and admin forms wired to API. | Student login works; admin can manage versioned questions/config. |
| **C. Assessment session** | Attempt lifecycle, ordering, timing, response APIs. | Question renderer, progress/timers, refresh/reconnect/timeout UI. | One student can answer, refresh, resume, and reach the next item correctly. |
| **D. Score and profile** | Scoring, profile persistence/history APIs. | Result and retake/history views. | Scores, tie labels, and history agree end-to-end. |
| **E. Module acceptance** | Resolve API/data defects and migration ordering. | Resolve UI/accessibility and integration defects. | Acceptance criteria in `IMPLEMENTATION_PLAN.md` pass with fictional demo data. |

## File and merge rules

- Keep `frontend/`, `backend/`, and `shared/` ownership separate; do not reformat or modify another owner's files without coordination.
- Never edit the same file concurrently. Use feature branches and small merges at the checkpoints above.
- All API changes flow through `shared/` Zod schemas first. All database changes use new Prisma migrations; Developer 1 sequences merges.
- Questionnaire drafts and reviewed versions belong in `docs/questionnaires/`. The developers implement question storage/rendering but do not invent or publish final question wording without review.
- Use fictional students, responses, and tokens in development. Real student use waits for school approval and consent/data-retention procedures.

