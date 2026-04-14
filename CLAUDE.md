# Job Management Dashboard

## Project Overview
A full-stack job management dashboard.

## Tech Stack
- Backend: Django + Django REST Framework + PostgreSQL
- Frontend: React + TypeScript + Vite
- Infrastructure: Docker Compose
- Testing: Playwright E2E

## Critical Constraint
The evaluator runs `make test` on a fresh machine with ONLY these installed:
- make
- docker
- docker compose v2
- bash

The entire build must be completely self-contained. No host dependencies.

## Project Structure
- /backend  → Django app
- /frontend → React/TypeScript app
- /e2e      → Playwright tests
- docker-compose.yml
- Makefile

## Code Standards
- TypeScript: strict mode, no `any` types
- React: functional components with hooks only, named exports
- Django: class-based views preferred, type hints on all functions
- Always handle API errors gracefully in the frontend

## Key Commands
- `make build` - Build Docker images
- `make up` - Start the full stack
- `make test` - Run Playwright E2E tests
- `make stop` - Stop containers
- `make clean` - Remove volumes/networks

## Important Rules
- Docker Compose must use health checks so Django never starts before Postgres is ready
- Playwright tests must use waitFor assertions, never arbitrary sleeps or fixed timeouts
- The Django GET /api/jobs/ endpoint must use an efficient DB query for the latest status per job (DISTINCT ON or subquery) — assume millions of rows
- Pagination is required on the jobs list endpoint

## Current Progress

### Completed
- Django backend (models, serializers, views, URLs, settings, migrations)
- Backend infrastructure (Dockerfile, entrypoint.sh, requirements.txt)
- React/TypeScript frontend (types, API client, hooks, components)
- Frontend infrastructure (Dockerfile, nginx.conf, vite.config.ts, tsconfig.json, package.json)
- Docker Compose and Makefile

### Remaining
- Playwright E2E tests (Dockerfile, config, test suite)
- README.md