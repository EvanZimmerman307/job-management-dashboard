.PHONY: build up test test-frontend test-backend stop clean

build:
	docker compose build

up:
	docker compose up -d postgres backend frontend

test: build
	docker compose down -v --remove-orphans 2>/dev/null || true
	docker compose run --rm frontend-test
	docker compose run --rm --entrypoint python backend manage.py test app.jobs --verbosity=2
	docker compose up -d postgres backend frontend
	docker compose run --rm e2e
	docker compose down -v

test-frontend: build
	docker compose run --rm frontend-test

test-backend: build
	docker compose run --rm --entrypoint python backend manage.py test app.jobs --verbosity=2

stop:
	docker compose stop

clean:
	docker compose down -v --remove-orphans
