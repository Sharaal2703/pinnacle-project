# Database setup

The Pre-Assessment module uses PostgreSQL with Prisma. Configure `DATABASE_URL` in `backend/.env` to point to your PostgreSQL instance. Keep credentials in this ignored file and out of source control.

## First-time setup

### Configure PostgreSQL

Set `DATABASE_URL` to the connection string for your development database and `JWT_SECRET` to a private development secret. Then run:

```powershell
npm run db:migrate
npm run db:seed
```

Use a separate development database or schema per developer where possible. If you share a database, coordinate migrations and use fictional data only. Seeding adds reference pathways/configuration and imports new questionnaire versions as draft/inactive; it does not create users or approve questionnaire content. Schema changes are applied through migrations.

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

## Developer and environment boundary

- Prefer separate development databases/schemas for each developer. If one cloud database is shared, coordinate migrations and avoid parallel changes to shared data.
- Developer 1 owns Prisma schema changes and migrations and sequences migration merges, as defined in `PRE_ASSESSMENT_CONTRACT.md`.
- Use fictional accounts, questions, and responses. Do not load real student data.
- A cloud staging database can be introduced at the integration stage if remote collaboration or deployment requires it. It must have separate credentials, restricted access, backups, and fictional data. Production hosting and real student data require a separate school approval and data-handling decision.
- Never commit `.env`, database credentials, dumps, or real student records. `backend/.env.example` is the backend configuration template. Never reuse sample credentials outside local development.
