# Local database setup

The Pre-Assessment module uses PostgreSQL with Prisma. The backend reads `DATABASE_URL` from `backend/.env`; it can point to the cloud database or a local PostgreSQL container. The repository-root `.env` is used only by Docker Compose for its optional local database.

## Requirements

- Docker Desktop (or Docker Engine) with the Compose plugin.
- A free local TCP port, `5432` by default.

## First-time setup

### Use the cloud database

Keep the cloud credentials in `backend/.env` (which is ignored by Git). Set its `DATABASE_URL` to the cloud connection string and its `JWT_SECRET` to a private development secret. Do not copy the cloud URL into the root `.env`; the backend-local file is authoritative. Then run:

```powershell
npm run db:migrate
npm run db:seed
```

Use a separate development database or schema per developer where possible. If you share one cloud database, coordinate migrations and use fictional data only. Seeding adds reference pathways/configuration and imports new questionnaire versions as draft/inactive; it does not create users or approve questionnaire content. Schema changes are applied through migrations.

### Use the optional local Docker database

Copy the root template to `.env` and start PostgreSQL. Then set `DATABASE_URL` in `backend/.env` to the local connection string shown in `backend/.env.example`.

```powershell
Copy-Item .env.example .env
docker compose up -d db
docker compose ps
npm run db:migrate
npm run db:seed
```

The root `.env` contains Compose variables only; backend credentials stay in `backend/.env`.

The migration `20261017000000_revoke_unverified_question_approval` deactivates shipped sample question rows carrying the old self-declared review-panel metadata. Existing attempts remain intact.

To provision an administrator for local use, set `ADMIN_NAME`, `ADMIN_USERNAME`, and `ADMIN_PASSWORD` in the current shell and run `npm run db:provision-admin`. Use a password with at least 12 characters, then clear those shell variables. The command only creates a new admin and refuses to modify an existing account. Server startup never creates admin credentials.

PowerShell example (enter a unique local password when prompted):

```powershell
$env:ADMIN_NAME = "Local Administrator"
$env:ADMIN_USERNAME = "admin"
$securePassword = Read-Host "Admin password" -AsSecureString
$env:ADMIN_PASSWORD = [System.Net.NetworkCredential]::new("", $securePassword).Password
npm run db:provision-admin
Remove-Item Env:ADMIN_NAME, Env:ADMIN_USERNAME, Env:ADMIN_PASSWORD
Remove-Variable securePassword
```

## Daily commands

```powershell
docker compose up -d db
docker compose logs -f db
docker compose stop db
docker compose down
```

`docker compose down` preserves the named database volume. `docker compose down -v` deletes the local database and all its data; use it only when intentionally resetting your local database.

If local port `5432` is already occupied, set `POSTGRES_PORT` in the root `.env` to another host port (for example `5433`) and update the local `DATABASE_URL` in `backend/.env` to match.

## Developer and environment boundary

- Prefer separate development databases/schemas for each developer. If one cloud database is shared, coordinate migrations and avoid parallel changes to shared data.
- Developer 1 owns Prisma schema changes and migrations and sequences migration merges, as defined in `PRE_ASSESSMENT_CONTRACT.md`.
- Use fictional accounts, questions, and responses. Do not load real student data.
- A cloud staging database can be introduced at the integration stage if remote collaboration or deployment requires it. It must have separate credentials, restricted access, backups, and fictional data. Production hosting and real student data require a separate school approval and data-handling decision.
- Never commit `.env`, database credentials, dumps, or real student records. The root `.env.example` contains local Compose settings; `backend/.env.example` is the backend template. Never reuse sample credentials outside local development.
