# Local database setup

The Pre-Assessment module uses PostgreSQL with Prisma. During development, each developer runs an independent PostgreSQL database in Docker. The repository does not depend on a cloud database.

## Requirements

- Docker Desktop (or Docker Engine) with the Compose plugin.
- A free local TCP port, `5432` by default.

## First-time setup

From the repository root, copy `.env.example` to `.env`. Keep `.env` private and change the sample password if this machine is accessible to other users. The sample credentials are for local development only.

```powershell
Copy-Item .env.example .env
docker compose up -d db
docker compose ps
```

The `db` service becomes healthy when PostgreSQL accepts connections. The backend will use `DATABASE_URL` from `.env`; Prisma migrations will be introduced with the backend workspace.

## Daily commands

```powershell
docker compose up -d db
docker compose logs -f db
docker compose stop db
docker compose down
```

`docker compose down` preserves the named database volume. `docker compose down -v` deletes the local database and all its data; use it only when intentionally resetting your local database.

If port `5432` is already occupied, set `POSTGRES_PORT` in `.env` to another host port (for example `5433`) and update the port in `DATABASE_URL` to match.

## Developer and environment boundary

- Each developer owns a separate local database. Do not point both developers at a shared writable development database.
- Developer 1 owns Prisma schema changes and migrations and sequences migration merges, as defined in `PRE_ASSESSMENT_CONTRACT.md`.
- Use fictional accounts, questions, and responses. Do not load real student data.
- A cloud staging database can be introduced at the integration stage if remote collaboration or deployment requires it. It must have separate credentials, restricted access, backups, and fictional data. Production hosting and real student data require a separate school approval and data-handling decision.
- Never commit `.env`, database credentials, dumps, or real student records. `.env.example` is the safe template.
