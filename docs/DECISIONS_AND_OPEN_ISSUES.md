# MindBridge decisions and open issues

This register separates decisions already set for implementation from decisions that still require team, mentor, or school input. Until an open item is confirmed, implement the stated provisional behavior behind configuration and use fictional data.

**Current phase:** first creation of the Pre-Assessment module only. The current developer contract and implementation boundary are in `PRE_ASSESSMENT_CONTRACT.md`. Curriculum learning, academic assessment, adaptation, and reporting decisions remain future-phase context.

## Working decisions

| ID | Decision | Owner / timing |
|---|---|---|
| D-01 | Use the SRS v1.1 as the scope authority; HLD/LLD detail applies to Pre-Assessment only. | Both developers; before feature work |
| D-02 | MVP pathways are the six in the SRS. Exclude Interpersonal and Intrapersonal; revise HLD scenario options accordingly. | Developer 1; before question seed |
| D-12 | Use Tamil Nadu Government school textbooks for Grades 6-8 as the curriculum source; use the user-provided [book index](https://www.tntextbooks.in/p/school-books.html) to locate them and verify publisher/edition metadata on each PDF. | Developer 2; selected |
| D-03 | Use React + TypeScript, Node.js + TypeScript + Express, PostgreSQL, and a modular monolith. | Both developers; selected |
| D-04 | Preference scoring uses self-report and scenario answers only; no response-time penalty, task-correctness contribution, or observation blending. | Developer 1; before scorer implementation |
| D-05 | Return the SRS 0-100 normalized preference score as the canonical score; retain score availability and ranking metadata. | Developer 1; before API implementation |
| D-06 | Keep academic scores, engagement, objective tasks, and observer inputs separate from preference profile data. | Both developers; applies throughout |
| D-07 | Use an initial 25-minute total assessment deadline, 60 seconds per self-report question, 90 seconds per scenario question, and a two-second network grace; keep all limits configurable. | Developer 1; before timer implementation |
| D-08 | Use the contract endpoint shapes and DTOs as the integration boundary; update the contract before changing a shared interface. | Both developers; ongoing |
| D-09 | Use npm workspaces for `frontend/`, `backend/`, and `shared/`; keep shared Zod schemas in `shared/`, generate OpenAPI and TypeScript types from them, and use Prisma migrations for PostgreSQL. | Developer 1; during foundation |
| D-10 | Start with 18 preference questions (six self-report and twelve balanced scenarios); require 15 answers to issue a profile; show top scores within five points as similar/blended. | Developer 1; seed and scorer configuration |
| D-11 | Start with an 80% mastery threshold; after two completed content attempts below 60%, recommend secondary/blended content after diagnostic checks. Both values remain pilot-configurable; no automatic pathway change. | Developer 2; before outcome reporting |
| D-13 | Implement only Pre-Assessment in the current phase; defer curriculum learning and post-assessment modules. | Both developers; selected |

## Open decisions requiring confirmation

| ID | Question | Recommended interim behavior | Needed by |
|---|---|---|---|
| O-01 | Is MVP content English-only or English + Tamil? | English-only UI/content seed; keep language metadata configurable. | Before authoring production content |
| O-02 | Which textbook edition/medium and which grades, subjects, chapters, and concepts are included in the initial content set? | Use the Tamil Nadu Government school textbooks for Grades 6-8; wait for the user's full content update before selecting or authoring sample concepts. | Before content seed |
| O-03 | Which specific question wording and scenario mappings pass teacher review and student comprehension checks? | Seed the 18-item structure from D-10; do not publish unreviewed questions. | Before question-bank pilot |
| O-04 | Do timing, completion, and near-tie defaults work for the pilot population? | Pilot the D-07 and D-10 defaults; adjust through configuration using observed completion/usability data. | After student usability pilot |
| O-05 | Do the mastery and adaptation defaults work for the selected curriculum and assessment? | Pilot the D-11 thresholds; do not present them as validated universal criteria. | Before drawing learning-outcome conclusions |
| O-06 | Which school/mentor approves resources and assessment questions, and who can publish? | Admin/teacher review permission required; no unreviewed student-visible content. | Before publishing workflow is enabled |
| O-07 | What hosting, deployment, backup, and restore environment will be used? | Local demo only; define deployment and test restoration before real pilot. | Before pilot |
| O-08 | What consent, retention, deletion, and access process applies to minors' data? | Use fictional seed data; block real student onboarding until the institution approves the process. | Before real student data |
| O-09 | Are parent/guardian accounts needed in the MVP? | Excluded unless explicitly approved; observations remain disabled. | Before role implementation closes |
## HLD/LLD issues to keep visible

1. The HLD calls the 15-minute/900-second limit provisional, while the SRS targets 20-30 minutes. D-07 selects a configurable 25-minute default for the MVP.
2. Question composition differs across HLD sections: one describes six self-report, eight scenarios, and six tasks; another timing table describes eight self-report, four scenarios, and eight tasks. D-10 selects an 18-item preference-only initial bank; objective tasks are deferred.
3. HLD prose says no time penalty and observations are separate, but its later scoring steps apply a time penalty and blend observations. The SRS rules and the contract's separation decision control implementation.
4. HLD scenario options include Interpersonal and Intrapersonal even though the SRS excludes those pathways. Do not seed those choices in this MVP.
5. HLD describes both relative-to-top profile values and 0-100 absolute scores. The SRS's 0-100 normalized score is the API/storage canonical score; do not expose ambiguous fields named only `profile` or `percent`.
6. The SRS is for a four-person team, but this work is assigned to two developers. Use the ownership split in `WORK_SPLIT.md`; it replaces the document's team-size assumption, not product requirements.

