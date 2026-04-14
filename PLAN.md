# Job Management Dashboard — Implementation Plan

## Context

This is a take-home full-stack engineering exercise for Rescale. The evaluator runs `make test` on a fresh machine with only `make`, `docker`, `docker compose v2`, and `bash` installed. The build must be fully self-contained. If `make test` fails, the submission is not evaluated further.

The goal is a clean, well-structured implementation of a job dashboard (Django + PostgreSQL backend, React + TypeScript frontend, Playwright E2E tests) that demonstrates proficiency with the full stack and thoughtful handling of the "millions of rows" performance constraint.

---

## Directory and File Structure

```
/
├── CLAUDE.md
├── Makefile
├── docker-compose.yml
├── README.md
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── entrypoint.sh
│   ├── manage.py
│   └── app/
│       ├── __init__.py
│       ├── settings.py
│       ├── urls.py
│       ├── wsgi.py
│       └── jobs/
│           ├── __init__.py
│           ├── models.py
│           ├── serializers.py
│           ├── views.py
│           ├── urls.py
│           └── migrations/
│               ├── __init__.py
│               └── 0001_initial.py
│
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── types.ts
│       ├── api/
│       │   └── jobs.ts
│       ├── components/
│       │   ├── JobList.tsx
│       │   ├── JobRow.tsx
│       │   ├── CreateJobForm.tsx
│       │   ├── StatusBadge.tsx
│       │   └── ErrorBanner.tsx
│       └── hooks/
│           └── useJobs.ts
│
└── e2e/
    ├── Dockerfile
    ├── package.json
    ├── package-lock.json
    ├── playwright.config.ts
    └── tests/
        └── jobs.spec.ts
```

---

## Backend

### Django Models (`backend/app/jobs/models.py`)

```python
class Job(models.Model):
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

class JobStatus(models.Model):
    class StatusType(models.TextChoices):
        PENDING = "PENDING"
        RUNNING = "RUNNING"
        COMPLETED = "COMPLETED"
        FAILED = "FAILED"

    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name="statuses")
    status_type = models.CharField(max_length=20, choices=StatusType.choices)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-timestamp"]
        indexes = [models.Index(fields=["job", "-timestamp"])]
```

Key decisions:
- `TextChoices` strings — API sends human-readable values, no mapping layer
- Composite index on `(job_id, timestamp DESC)` is critical for the correlated subquery performance at scale
- `Job.updated_at` auto-refreshes via `auto_now=True` on each `job.save()`

### API Endpoints

**GET /api/jobs/** — paginated job list with current status
```json
{
  "count": 1042, "next": "...?page=2", "previous": null,
  "results": [{ "id": 7, "name": "...", "status": "PENDING", "created_at": "...", "updated_at": "..." }]
}
```

**POST /api/jobs/** — create job, returns same shape as a list item
```json
// request:  { "name": "Render video clip" }
// response 201: { "id": 8, "name": "...", "status": "PENDING", ... }
// response 400: { "name": ["This field may not be blank."] }
```

**PATCH /api/jobs/<id>/** — creates new JobStatus row, returns updated job
```json
// request:  { "status": "RUNNING" }
// response 200: { "id": 7, ..., "status": "RUNNING", "updated_at": "..." }
// response 400: { "status": ["\"INVALID\" is not a valid choice."] }
```

**DELETE /api/jobs/<id>/** — 204 no content; cascades to all JobStatus rows

### Query Strategy for Latest Status (Performance Critical)

Use a Django ORM `Subquery` annotation — generates a correlated subquery that the `(job_id, timestamp DESC)` index optimizes to one index probe per job row on the page:

```python
from django.db.models import OuterRef, Subquery

latest_status = (
    JobStatus.objects.filter(job=OuterRef("pk"))
    .order_by("-timestamp")
    .values("status_type")[:1]
)
queryset = Job.objects.annotate(current_status=Subquery(latest_status))
```

Generated SQL:
```sql
SELECT id, name, created_at, updated_at,
  (SELECT status_type FROM jobs_jobstatus
   WHERE job_id = jobs_job.id
   ORDER BY timestamp DESC LIMIT 1) AS current_status
FROM jobs_job ORDER BY created_at DESC;
```

This approach is preferred over raw DISTINCT ON because it integrates natively with DRF's `PageNumberPagination` (`.count()` works, `.filter()` works).

### Pagination

`PageNumberPagination` with `PAGE_SIZE = 20`, max `page_size = 100`. Response shape includes `count`, `next`, `previous`, `results`. Total count is displayed in the UI header (e.g., "1,042 jobs").

Cursor pagination was considered but rejected: it removes the `count` field and prevents showing a total, which matters for a dashboard UI.

### Django Settings — Key Points

- `dj-database-url` parses `DATABASE_URL` env var
- `django-cors-headers` with `CORS_ALLOWED_ORIGINS = ["http://localhost:5173"]` for local dev (nginx eliminates CORS in production)
- No `django.contrib.admin` — not needed, keeps migrations minimal
- `DEBUG=0` in Docker; `SECRET_KEY` from env var

### `entrypoint.sh`

```bash
#!/bin/bash
set -e
python manage.py migrate --noinput
exec gunicorn app.wsgi:application --bind 0.0.0.0:8000 --workers 2
```

Postgres is guaranteed healthy before this runs via `depends_on: condition: service_healthy`, so no `wait-for-it.sh` loop needed.

### `requirements.txt`
```
Django==5.0.4
djangorestframework==3.15.1
psycopg2-binary==2.9.9
gunicorn==22.0.0
dj-database-url==2.1.0
django-cors-headers==4.3.1
```

---

## Frontend

### Architecture

- **Vite + React + TypeScript** (strict mode)
- **`@tanstack/react-query` v5** for server state: caching, background refetch, mutation invalidation
- **Tailwind CSS** for styling — utility classes, no separate CSS files
- **Relative `/api` base URL** — works in both Vite dev proxy and nginx production proxy without environment config

### Component Tree

`useJobs` is called **once** in `Dashboard`. All server state and mutations flow down as props — `JobList` is a pure presentational component with no React Query dependency.

```
App
└── QueryClientProvider
    └── Dashboard                (owns all state via useJobs hook)
        ├── ErrorBanner          props: { message: string | null }
        ├── CreateJobForm        props: { onSubmit: (name: string) => Promise<void> }
        └── JobList              props: { jobs, count, page, hasNext, hasPrev, isLoading,
                                          onPageChange, onStatusChange, onDelete, onError }
            ├── pagination controls (inline)
            └── JobRow[]         props: { job: Job; onStatusChange; onDelete; onError }
                ├── StatusBadge  props: { status: StatusType | null }
                ├── <select>     status dropdown — triggers PATCH on change
                └── delete button
```

### `useJobs` hook (`src/hooks/useJobs.ts`)

```typescript
// Returns: { jobs, count, hasNext, hasPrev, page, setPage,
//            isLoading, error,
//            createJob, createError,
//            updateJobStatus, updateError,
//            deleteJob, deleteError }
// Uses useQuery(["jobs", page]) and useMutation with
// queryClient.invalidateQueries(["jobs"]) on success.
// Called exactly once in Dashboard — avoids duplicate query subscriptions.
```

### `data-testid` Attributes Required (for Playwright)

| Element | `data-testid` |
|---|---|
| Name input in CreateJobForm | `job-name-input` |
| Submit button | `create-job-submit` |
| Job list container | `job-list` |
| Each job row | `job-row` |
| Status badge | `status-badge` |
| Status select dropdown | `status-select` |
| Delete button | `delete-job-button` |

### Large Dataset Strategy

The backend is paginated at 20 jobs/page. The frontend uses traditional page controls (Prev / Next / page number display). This is the correct UX pattern for a management dashboard — infinite scroll and virtual scrolling are inappropriate here.

With `@tanstack/react-query`, previously-fetched pages are cached so navigating back to page 1 is instant. `staleTime: 30_000` prevents redundant refetches during normal use.

### Nginx Proxy (`frontend/nginx.conf`)

```nginx
server {
    listen 80;
    location /api/ {
        proxy_pass http://backend:8000;
    }
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }
}
```

The `/api/` proxy means the browser makes same-origin requests to nginx — no CORS required in production. The Vite dev server has an equivalent `server.proxy` config in `vite.config.ts`.

### Frontend Dockerfile (multi-stage)

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.25-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

---

## Docker Compose Architecture

Services: `postgres` → `backend` → `frontend` → `e2e`

All on a shared `app_net` bridge network. Services use Docker DNS names (`backend`, `frontend`, `postgres`) as hostnames.

**Startup ordering via health checks:**
- `postgres` has a `pg_isready` healthcheck
- `backend` depends on `postgres: condition: service_healthy`; its own healthcheck hits `GET /api/jobs/`
- `frontend` depends on `backend: condition: service_healthy`
- `e2e` depends on `backend: condition: service_healthy` and `frontend: condition: service_started`

**E2E container:** `BASE_URL=http://frontend:80` — Playwright talks directly to the nginx container inside Docker's network.

---

## Makefile

```makefile
.PHONY: build up test stop clean

build:
	docker compose build

up:
	docker compose up -d postgres backend frontend

test: build
	docker compose up -d postgres backend frontend
	docker compose run --rm e2e
	docker compose down

stop:
	docker compose stop

clean:
	docker compose down -v --remove-orphans
```

`make test` builds images, starts the stack (health checks ensure readiness), runs the Playwright container once with `--rm`, then tears everything down. Exit code from `docker compose run` propagates — non-zero if tests fail.

---

## Playwright E2E Tests (`e2e/tests/jobs.spec.ts`)

### Dockerfile

```dockerfile
FROM mcr.microsoft.com/playwright:v1.43.0-jammy
WORKDIR /e2e
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
CMD ["npx", "playwright", "test", "--reporter=list"]
```

### Test Plan

**Test isolation:** Each test creates a job with a unique timestamp-based name (e.g., `Job-${Date.now()}`). Assertions filter to that specific row. An `afterEach` hook deletes the created job via the API using Playwright's `request` fixture. This avoids shared state without needing DB truncation infrastructure.

**Test 1: Create a job → appears with PENDING status**
```
1. page.goto(BASE_URL)
2. Fill data-testid="job-name-input" with unique name
3. Click data-testid="create-job-submit"
4. await expect(page.getByTestId("job-list")).toContainText(jobName)
5. const row = page.locator('[data-testid="job-row"]', { hasText: jobName })
6. await expect(row.getByTestId("status-badge")).toHaveText("PENDING")
```

**Test 2: Update job status → change reflected in list**
```
1. Create a job via API (request fixture), record id for cleanup
2. page.goto(BASE_URL)
3. Locate the row by unique job name
4. row.getByTestId("status-edit-button").click()
5. row.getByTestId("status-select").selectOption("RUNNING")
6. await expect(row.getByTestId("status-badge")).toHaveText("RUNNING")
```

**Test 3: Delete a job → removed from the list**
```
1. Create a job via API (request fixture), record id for cleanup
2. page.goto(BASE_URL)
3. Locate the row by unique job name
4. row.getByTestId("job-menu-button").click()   // open kebab menu
5. row.getByTestId("delete-job-button").click()
6. await expect(row).not.toBeVisible()
7. createdJobId = null  // already deleted, skip afterEach cleanup
```

All assertions use Playwright's built-in retry (`expect(...).toHaveText()`, `expect(...).not.toBeVisible()`). No `waitForTimeout` or arbitrary sleeps anywhere.

---

## Filtering & Sorting

### Backend — `backend/app/jobs/views.py`

Override `get_queryset()` on `JobListCreateView` to read two optional query params:

- `?status=PENDING|RUNNING|COMPLETED|FAILED` — filters by annotated `current_status`
- `?ordering=name|-name|created_at|-created_at` — whitelist-guarded `.order_by()`; default `-created_at`

```python
def get_queryset(self):
    qs = _annotated_queryset()
    status = self.request.query_params.get("status")
    if status:
        qs = qs.filter(current_status=status)
    ordering = self.request.query_params.get("ordering", "-created_at")
    if ordering in {"name", "-name", "created_at", "-created_at"}:
        qs = qs.order_by(ordering)
    return qs
```

No migration needed — purely a queryset change.

### Frontend API — `frontend/src/api/jobs.ts`

Add `status` and `ordering` params to `fetchJobs`, built via `URLSearchParams`:

```typescript
export async function fetchJobs(
  page: number,
  status?: StatusType | null,
  ordering?: string,
  pageSize = 20,
): Promise<PaginatedResponse<Job>>
```

### Frontend Hook — `frontend/src/hooks/useJobs.ts`

- Add `status: StatusType | null` state (default `null`)
- Add `ordering: string` state (default `"-created_at"`)
- Expand query key to `["jobs", page, status, ordering]`
- `setStatus` and `setOrdering` each reset `page` to `1`
- Return `status`, `setStatus`, `ordering`, `setOrdering`

### Frontend UI

**`frontend/src/components/JobList.tsx`** — add props `status`, `onStatusFilter`, `ordering`, `onOrderingChange` and a toolbar row above the table with two selects:
- Status filter (`data-testid="status-filter"`): "All statuses" (null), PENDING, RUNNING, COMPLETED, FAILED
- Sort (`data-testid="ordering-select"`): "Newest first" (`-created_at`), "Oldest first" (`created_at`), "Name A–Z" (`name`), "Name Z–A" (`-name`)

**`frontend/src/App.tsx`** — destructure `status`, `setStatus`, `ordering`, `setOrdering` from `useJobs()` and pass down to `<JobList>`.

### E2E Tests — `e2e/tests/jobs.spec.ts`

**Test 4: Filter by status**
```
1. Create job A via API (stays PENDING); record id
2. Create job B via API, PATCH to RUNNING; record id
3. page.goto("/")
4. page.getByTestId("status-filter").selectOption("PENDING")
5. await expect(row A).toBeVisible()
6. await expect(row B).not.toBeVisible()
7. Cleanup both in afterEach
```

**Test 5: Sort by name**
```
1. Create "Aaa-${ts}" and "Zzz-${ts}" via API (both PENDING); record ids
2. page.goto("/")
3. page.getByTestId("status-filter").selectOption("PENDING")  // isolate test jobs
4. page.getByTestId("ordering-select").selectOption("name")   // A–Z
5. Verify Aaa row has lower DOM index than Zzz row
6. Switch to "-name" (Z–A), verify order reverses
7. Cleanup both in afterEach
```

---

## Future Extension Points (Not Implemented)

The architecture makes these stretch goals straightforward to add later:

**Job Status History View:** `JobStatus` rows are already stored with full timestamps. Adding a `GET /api/jobs/<id>/statuses/` endpoint (a filtered `JobStatus` list view) and a modal in `JobRow` that fetches and displays the timeline would require minimal new code.

---

## Critical Files

- `backend/app/jobs/models.py` — models + index definition
- `backend/app/jobs/views.py` — Subquery annotation, PATCH logic, atomic create
- `backend/app/jobs/serializers.py` — `JobSerializer` (reads `current_status`), `JobPatchSerializer`
- `frontend/src/hooks/useJobs.ts` — all server state management
- `frontend/src/api/jobs.ts` — fetch wrappers with error propagation
- `docker-compose.yml` — health check chain, network, e2e service
- `e2e/tests/jobs.spec.ts` — E2E test suite
- `Makefile` — `make test` must exit non-zero on failure
