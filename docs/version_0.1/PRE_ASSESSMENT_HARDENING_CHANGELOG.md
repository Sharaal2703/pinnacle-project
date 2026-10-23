# Pre-Assessment hardening changes

Branch: `feature/pre-assessment-hardening`

This document records the implementation changes made from the codebase review.

## Updates made

### Local database configuration

- Added a root `.env.example` for optional local Compose/PostgreSQL settings and kept backend credentials in `backend/.env.example`.
- Updated environment loading so `backend/.env` takes precedence (including a cloud `DATABASE_URL`); repository-root `.env` supplies optional Compose settings and fallback values.
- Added production startup checks requiring an explicitly configured `DATABASE_URL` and a `JWT_SECRET` of at least 32 characters.
- Removed the fixed Compose container name so separate checkouts can run without colliding on that name.
- Updated `DATABASE_SETUP.md` with migration, seed, and admin-provisioning steps.
- Clarified how to select cloud PostgreSQL or the optional local Compose database without mixing their environment files.

### Admin provisioning and seeding

- Removed database seeding from API startup.
- Removed hard-coded demo admin/student credentials from the seed service.
- Added `npm run db:provision-admin`, a one-time command that reads credentials from the current shell, enforces a 12-character minimum password, hashes it, and refuses to overwrite an existing account.
- Limited the ordinary seed command to pathways, default assessment configuration, and new draft questionnaire items.

### Questionnaire approval

- Changed the shipped questionnaire metadata to `DRAFT` and removed the unverified reviewer identity/date.
- The importer now always creates new question versions as `DRAFT` and inactive, ignores file-declared review approval, and leaves existing versions unchanged.
- Clarified that the sample prompts are not cleared for student use and require the user's confirmation plus an authorized teacher review.
- Added a migration to deactivate previously seeded rows carrying the former self-declared review-panel metadata and clear those review fields.

### Assessment attempt rules

- Existing attempts now load their captured assessment configuration version for timers and scoring; later admin changes apply only to new attempts.
- Starting after a total timeout finalizes the old attempt, records missing responses as timeouts, and scores it if it meets the answered threshold before opening a retake.
- Removed the request-time auto-seed fallback; a missing approved bank now returns a configuration error without publishing content.
- Current-question retrieval detects an expired total deadline and directs the client to finalize the attempt.

### Response concurrency

- Response persistence and attempt-index advancement now run in one database transaction.
- The transaction uses conditional updates and the response uniqueness constraint to reject duplicate/stale submissions with a `409 CONFLICT` response.

## Files updated

- `.env.example`, `compose.yaml`
- `backend/.env.example`, `backend/package.json`
- `backend/src/config/env.ts`, `backend/src/server.ts`
- `backend/src/services/attempt.service.ts`, `backend/src/services/config.service.ts`, `backend/src/services/seed.service.ts`
- `backend/prisma/seed.ts`, `backend/prisma/create-admin.ts`
- `backend/prisma/migrations/20261017000000_revoke_unverified_question_approval/migration.sql`
- `docs/DATABASE_SETUP.md`, `docs/IMPLEMENTATION_PLAN.md`, `docs/PRE_ASSESSMENT_CONTRACT.md`
- `docs/questionnaires/README.md`, `docs/questionnaires/pre-assessment-v1-en.json`

## Developer commands

```powershell
Copy-Item .env.example .env
docker compose up -d db
npm run db:migrate
npm run db:seed
npm run db:provision-admin
```

Set `ADMIN_NAME`, `ADMIN_USERNAME`, and `ADMIN_PASSWORD` in the shell before the last command. Do not use real student data or expose the local template credentials in a deployed environment.

## Verification status

- Shared and backend TypeScript builds passed.
- Frontend TypeScript/Vite production build passed when rerun with elevated filesystem access; the sandboxed attempt hit a Windows `EPERM` while resolving a source path.
- Prisma schema validation passed with a local dummy `DATABASE_URL`.
- Backend tests were not run in this change session.
- Docker Compose configuration could not be validated because the Docker CLI is not installed in this environment.
- Apply the new migration to local databases before running the updated application.
