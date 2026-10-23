# Module 2: Learning Library Foundation

This module stores Grade 6–8 curriculum structure and versioned learning-resource metadata, supports teacher review and admin publication, serves published resources to authenticated students, and saves concept progress.

## Scope in this implementation

- Curriculum: Subject → Grade-specific Chapter → Concept. Each chapter is assigned Term 1, 2, or 3 for its grade, with curriculum reference, objective, difficulty, and order.
- Initial resource pathways: Visual (`VIS`), Linguistic (`LING`), and Logical-Mathematical (`LOGI`). The assessment continues to score all eight pathways.
- Formats: video, image, and PDF; English only for this MVP.
- Workflow: admin enters the resource details and uploads its file → the teacher assigned to the resource's subject and grade views the complete resource and approves or rejects it → admin publishes approved resources to students.
- Student catalog is grade-specific and shows published English resources for the student's current primary and secondary preference pathways.
- A student must have a current pre-assessment profile. Resource access is authenticated and uses an expiring signed URL, not a public object URL.
- Student concept progress is persisted and can be resumed.

## Database relationships

`Subject` 1—many `CurriculumChapter`; a chapter belongs to one grade. `CurriculumChapter` 1—many `CurriculumConcept`. A concept can have many versioned `LearningResource` rows. Each resource has one pathway, creator, format, English language code, workflow status, and optional Storage object metadata. `Student` 1—many `ConceptProgress`; each student has at most one progress row per concept. The latest resource opened for a concept can be stored on progress.

Resource revisions are append-only: create a new `resourceKey`/version row for a new revision instead of overwriting a published resource. Published records should be archived when retired.

## API routes

All routes are under `/api/v1/learning` and use the existing bearer-token authentication middleware.

| Method and path | Role | Purpose |
| --- | --- | --- |
| `GET /catalog` | Student | Grade, profile pathways, chapters, concepts, published matching resources, progress |
| `GET /resources/:resourceId/open` | Student | Return a one-hour signed URL after grade, profile, pathway, and publication checks |
| `PUT /concepts/:conceptId/progress` | Student | Save `IN_PROGRESS`, `COMPLETED`, or `NEEDS_REVIEW`, 0–100%, and optional resource id |
| `POST /admin/resources` | Admin | Enter resource metadata as a `DRAFT` |
| `POST /admin/resources/:resourceId/upload-intent` | Admin | Prepare a short-lived private Storage upload for an admin-created draft |
| `PUT /admin/resources/:resourceId/file` | Admin | Verify uploaded object, save its metadata, and submit the complete resource to `PENDING_REVIEW` |
| `GET /teacher/review-queue` | Teacher | List uploaded resources matching the teacher's assigned subject and grade |
| `GET /teacher/resources/:resourceId/open` | Teacher | Return a 15-minute signed URL to view pending media |
| `POST /teacher/resources/:resourceId/review` | Teacher | Approve or reject the complete resource when assigned to its subject and grade |
| `GET /admin/curriculum?grade=6` | Admin | List chapters, optionally filtered by grade |
| `POST /admin/curriculum/chapters` | Admin | Create a Grade 6–8 chapter |
| `POST /admin/curriculum/chapters/:chapterId/concepts` | Admin | Add a concept to a chapter |
| `GET /admin/resources?status=APPROVED` | Admin | Review resources and current workflow state |
| `POST /admin/resources/:resourceId/publish` | Admin | Publish an approved resource after file metadata is present |

Resource file metadata accepts `storageBucket`, `storagePath`, `mimeType`, `fileSizeBytes`, and optional `durationSeconds`. Limits: video 200 MB, image 10 MB, PDF 20 MB. Content MIME types are checked against the selected format. The API will only accept the configured private bucket.

## Storage setup

Create a **private** Supabase Storage bucket named `mindbridge-learning` (or set another bucket name in backend configuration). Configure these values in `backend/.env` only:

```dotenv
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<server-only-secret>
SUPABASE_STORAGE_BUCKET=mindbridge-learning
```

Never put the service-role key in frontend variables or commit a real key. The backend uses it to create signed URLs after authorizing students and teachers, and short-lived upload credentials for admins. Set Supabase's bucket size limit to at least 200 MB. This first implementation sends each admin file in one signed `PUT` request; an interrupted upload must be restarted. Supabase recommends resumable TUS uploads for files over 6 MB, so resumable upload should replace the single-request uploader before routinely uploading large videos. The resource remains a draft until the backend verifies the uploaded object; only the assigned teacher can then review it. Do not set `status=PUBLISHED` until the teacher has approved it and the admin publishes it.

The Supabase free plan's configured maximum upload size may be below the application's video cap. The app limit is 200 MB; the actual cloud project plan and bucket limit must also allow it.

## Migration and local setup

The schema change is represented by `backend/prisma/migrations/20261020120000_learning_content_foundation/migration.sql`. Generate the Prisma client after pulling the change, then apply the migration through the team's normal database migration procedure:

```powershell
cd backend
npx prisma generate
npx prisma migrate deploy
```

No curriculum/questionnaire data is seeded by this migration. Admins can enter chapters and concepts via the API; the curated TN textbook content still needs to be added after source material is selected and normalized.

## Current boundary

The learner catalog and progress UI are available at `/learning`; teachers use `/teacher/learning-review`; admins use `/admin/learning-resources` to enter curriculum and resource details, upload resources for review, and publish teacher-approved resources. Cloud Storage credentials are not committed. Uploads and student/teacher reads use signed URLs.
