# Job Management Dashboard

A full-stack job management dashboard built with Django, PostgreSQL, and React.

**Time spent:** 6 hours

## Prerequisites

The only dependencies required on your machine are:

- `make`
- `docker`
- `docker compose` (v2)
- `bash`

## Commands

### Build

Build all Docker images (backend, frontend, e2e):

```bash
make build
```

### Run

Start the application (Postgres, Django backend, React frontend):

```bash
make up
```

The frontend is available at [http://localhost:3000](http://localhost:3000).

### Stop

Stop all running containers without removing data:

```bash
make stop
```

### Test

Build images and run the full test suite (frontend unit tests, backend unit tests, and Playwright E2E tests) against the running stack:

```bash
make test
```

Exits with a non-zero code if any test fails. To run a single layer in isolation:

```bash
make test-frontend   # Vitest component tests
make test-backend    # Django unit tests
```

### Clean

Stop containers and remove all volumes and networks (resets the database):

```bash
make clean
```

## Architecture

| Layer | Technology |
|---|---|
| Backend API | Django + Django REST |
| Database | PostgreSQL |
| Frontend | React + TypeScript + Vite + Tailwind CSS |
| Proxy | nginx |
| E2E Tests | Playwright |
| Infrastructure | Docker Compose |

## API

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/jobs/` | Paginated list of jobs with current status. Optional query params: `?status=PENDING\|RUNNING\|COMPLETED\|FAILED` to filter, `?ordering=name\|-name\|created_at\|-created_at` to sort. |
| `POST` | `/api/jobs/` | Create a new job |
| `PATCH` | `/api/jobs/<id>/` | Update a job's status |
| `DELETE` | `/api/jobs/<id>/` | Delete a job |

Results are paginated at 20 jobs per page. The list endpoint uses a correlated subquery with a `(job_id, timestamp DESC)` index to resolve the latest status per job efficiently at scale.

## Local Development

To iterate on the frontend with hot module replacement, start the backend stack and run the Vite dev server separately:

```bash
make up                  # start Postgres + Django on localhost:8000
cd frontend
npm install
npm run dev              # frontend at http://localhost:5173
```
The Vite dev server proxies `/api/*` requests to `localhost:8000`, so no CORS configuration is needed.

## Stretch Goals
1. **Filtering/Sorting** — Jobs can be filtered by status and sorted by name or creation date via query params on the backend (`?status=`, `?ordering=`), with corresponding dropdowns in the frontend toolbar.
2. **Frontend unit tests** — Vitest + React Testing Library component tests covering `ErrorBanner`, `StatusBadge`, `CreateJobForm`, and `JobRow`, run as a dedicated Docker Compose service via `make test-frontend`.
3. **Backend unit tests** — Django test suite covering all four API endpoints (GET, POST, PATCH, DELETE) including edge cases like blank names, invalid status transitions, and cascade deletes, run via `make test-backend`.

*When the options button (3 dots) is clicked for a job, the user is presented with the choice to delete the job or view the job's status history. The view status history feature has not been implemented but the exterior was included to show my vision for the UI/UX*

## Performance Considerations

Two layers of the stack are specifically designed to handle a large number of jobs efficiently. On the backend, `GET /api/jobs/` uses a correlated subquery annotated via Django's ORM to resolve the latest status per job, backed by a composite `(job_id, timestamp DESC)` index on the `JobStatus` table. This avoids a full table scan and reduces the latest-status lookup to a single index probe per job on the current page. Results are paginated at 20 jobs per page using `PageNumberPagination`, so the query cost is proportional to the page size rather than the total number of jobs. On the frontend, `@tanstack/react-query` caches each page of results with a 30-second stale time, meaning navigating back to a previously visited page is instant and doesn't trigger a redundant network request. In production, nginx serves the pre-built React bundle as static files and reverse proxies API requests to Django, eliminating CORS overhead and ensuring the browser never opens a cross-origin connection.

# AI-Assisted Development Workflow

This project was built using Claude Code (via the VS Code extension). Rather than documenting every exchange, this section describes the key prompts that shaped the project's direction and the reasoning behind how the prompts were framed. This section also covers cases where the AI got something wrong and how the error was corrected.

---

## Planning Before Implementation

A deliberate separation between planning and implementation was enforced from the start. As a preliminary step, a `CLAUDE.md` file was created in the project root. This is a markdown file that Claude reads at the beginning of every session to understand the vision for the project. It covers the project's tech stack, constraints, code standards, architectural decisions, etc, and gets updated throughout the life of the project to maintain state across sessions. With that context in place, the initial planning prompt was:

> **"Please read the attached exercise specifications and `CLAUDE.md` file first to get context on the exercise and my vision. Then, without writing any code yet, create a detailed implementation plan covering:**
>
> 1. The complete directory and file structure for the entire project
> 2. The Django models (`Job` and `JobStatus`) and all associated API endpoints with exact request/response shapes
> 3. The PostgreSQL query strategy for efficiently fetching the latest status of jobs
> 4. A strategy for efficiently fetching and displaying jobs in the frontend if there are millions of jobs in the database
> 5. The React component tree
> 6. The Docker Compose architecture
> 7. The Makefile targets
> 8. The Playwright E2E test plan.  Initial tests should focus on a critical use case such as creating a new job and verifying it appears in the list with the correct initial status and then updating a job's status to a different available status and verifying the change. 
>
> Flag any design decisions I should make before you start coding."

Claude was switched to **plan mode** before receiving this prompt. Without plan mode, Claude can somestimes jump into implementation, even if you ask it not to. This can produce code that may be well-written, but doesn't address all specifications or makes narrow-sighted assumptions that are expensive and tedious to undo. By forcing the full design to be reviewed and approved before a single file was created, several non-trivial decisions were locked in upfront: using a Django ORM `Subquery` annotation rather than raw `DISTINCT ON` for the latest-status query, choosing `PageNumberPagination` over cursor-based pagination, using `@tanstack/react-query` for server state management, and routing all frontend requests through an nginx reverse proxy to eliminate CORS issues entirely. Any of these could have been revisited during implementation, but having them decided in advance meant implementation was largely mechanical execution of a reviewed spec rather than design-on-the-fly.

The specificity of the seven numbered items in the planning prompt also mattered. Vague planning prompts produce vague plans. By naming concrete concerns, such as the PostgreSQL query strategy for millions of rows, the resulting plan was detailed enough to execute without constant modification during implementation. I took a similar approach to planning for the development of the job filtering/sorting stretch goal.

---

## Verifying Sub Tasks Before Proceeding

After I approved Claude's plan, Claude Code generated a to-do list of sub-tasks. The to-do list essentially consisted of implementing the backend, then the frontend, and lastly integration testing. However, any form of intermediate verification of the completion of sub-tasks was missing from the generated to-do list.

>Todos 
>- Build Django backend (models, serializers, views, URLs, settings, migrations)
>- Build backend infrastructure (Dockerfile, entrypoint.sh, requirements.txt)
>- Build React/TypeScript frontend (types, API client, hooks, components)
>- Build frontend infrastructure (Dockerfile, nginx.conf, vite.config.ts, tsconfig.json, package.json)
>- Build Docker Compose and Makefile
>- Build Playwright E2E tests (Dockerfile, config, test suite)
>- Write README.md

Neglecting the verification of major milestones can lead to errors propogating through the project. This led me to manually introduce verification checkpoints by interrupting Claude during implementation:

> *"Let's run some checks to verify the Django backend and infrastructure have been set up correctly before moving on to the frontend."*

Interrupting implementation to explicitly verify a layer before building on top of it can catch real problems at the lowest possible cost. The backend check confirmed all four API endpoints behaved correctly, including the exact shape of validation error responses, and that migrations ran cleanly inside Docker. The frontend check caught some UI issues with an "Update Status / Actions" column. 

Bugs discovered one layer downstream are typically more expensive to fix than bugs caught at the layer where they originate. Telling Claude to verify rather than just letting it proceed is an important practice in AI driven development. In hindsight, it would have been better to have Claude update its to-do list to include some verification/checks, but I only caught the issue after the agent started coding.

---

## Course Corrections to Match Developer Vision

As mentioned previously, Claude's implementation of the UI for status changes and job deletion was not satisfactory. Claude had essentially created columns for each possible operation. I felt the design was unneccesarry and could be significantly polished and streamlined. After some initial back and forth I realized that my correction prompt needed to include not just a vague rejection but a specific alternative design:

> *"I don't see this as an improvement. How about we delete the actions column altogether. Then in the existing STATUS column, we add an edit symbol that the user can click to change the status. How about we also add a 3-dot button on each row that pops up a menu where users can delete or maybe in the future show job status history."*

This prompt rejected the original approach and revisions, and described exactly what the replacement should look like. That specificity enabled the improved UI to be implemented in a single pass. Initial vague rejections ("that doesn't look right, try something else") produced inadequate replacements. With AI driven development, precise course corrections reduce iteration time. The result also better aligned with modern UI design: inline edit via icon and bulk actions via kebab menu.

## Treating the Plan as a Living Document

Midway through frontend implementation, Claude made an architectural change. It lifted the `useJobs` hook from `JobList` up to the `Dashboard` component and passed data down as props. The change made sense and was technically correct, but it was undocumented in the plan. The prompt that caught this was:

> *"Since you updated the component/hook architecture by lifting the hook to Dashboard and passing data down as props, review the plan to see how this update affects the plan."*

This forced an explicit reconciliation between the code and the plan. The result was a documented record of why `JobList` became a pure presentational component. The idea here is that the plan is not just a starting document, it is an ongoing contract. Any time the implementation deviates from the plan, the AI should update the plan to maintain a single source of truth.

---

## Analyzing Trade-offs

When a coding agent makes changes like the one described above, even if it seems minor, it is important to think through any broader impacts of the change with the agent. The following prompt was used to evaluate the aforementioned change:

> *"What are the pros and cons of this change, and how will it be impacted by potentially millions of jobs in the database?"*

The deliberate choice to ask for pros *and* cons, tied to the specific performance constraint from the assignment spec, produced a more substantive answer than a simple "is this okay?" would have. Claude confirmed the change was a code organization improvement rather than a performance trade-off, and identified one minor performance benefit at scale: eliminating a redundant always-page-1 query that the old architecture triggered on mount. 

---

## Session Handoff and Context Management

Claude Code has no persistent memory between sessions. Managing this deliberately was a key meta-level workflow decision in the project. Each new session was opened with a handoff prompt that pointed to specific files and action items rather than re-describing the state of the project from memory or session summarization:

> *"I am working on a job management dashboard, specifically on frontend unit testing. Read `frontend/src/test` to specifically see the tests that were written. Read `PLAN.md` for the overall plan for this application and `CLAUDE.md` for the vision. Claude Code had previously made this much progress on the todo list for frontend testing before I needed to start a new session: [explicit todo list]. Please finish the rest of the todo items."*
---

## Catching Inconsistencies

Despite following good practices for session handoffs and context management, Claude can produce inconsistincies across sessions. These issues are subtle as they can still lead to desired behavior in the short-term, while at the same time introducing disorganization, unmaintainability, and subtle long-term problems. I caught an issue in this vein when asking Claude Code to implement frontend and backend unit testing across sessions:

> *"Can you explain why we have `npm run test` in the Dockerfile for the frontend, but in the Makefile there is an explicit `test-backend` target and the tests are integrated with the comprehensive `make test` target? These two different ways of testing don't make sense to me."*

Asking for an explanation before asking for a fix was the key move here. It gave Claude room to diagnose the actual problem, which turned out to be more significant than a stylistic inconsistency. Running `npm run test` inside a `RUN` layer in the Dockerfile means Docker caches the result after the first build. On subsequent runs, the tests appear to pass but are silently skipped because Docker reuses the cached layer. This is a category of CI bug that can go undetected for a long time. The fix was removing the test from the Dockerfile and adding a dedicated `frontend-test` docker-compose service with an explicit `test-frontend` make target. This produced a test setup that is both architecturally consistent and actually correct.

---

## Redirecting With a Specific Hypothesis

During frontend unit testing, a class of React `act()` warnings was producing significant noise in the test output. My initial response was to ask whether the warnings were meaningful:

> *"So the frontend tests produce a bunch of warnings like this: [warning text]. Are these meaningful warnings, and if not can we silence them?"*

Claude investigated, confirmed they were not meaningful in this context, but attempted targeted fixes. When those didn't resolve the issue and Claude proposed filtering `console.error` in the test setup as a workaround, I rejected that approach because I noticed that Claude had said this ultimately was a "React 18 + vitest compatibility issue". So I asked:

> *"Is this a versioning issue with React and vitest?"*

Rather than accepting the naive workaround, this reframing gave Claude a concrete alternative hypothesis to evaluate. The result was upgrading `@testing-library/react` to v15 and `vitest` to v2, which eliminated the warnings entirely without any suppression code. A `console.error` filter would have silenced the false positives but also hidden any future real warnings. Although Claude is very smart at diagnosing solutions, **once it goes down a rabbit hole it can struggle to consider alternative explanations**. As the developer it is important to still hypothesize your own explanations that stem from your own experience with similar issues.

---
