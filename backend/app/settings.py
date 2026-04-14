import os

import dj_database_url

SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key-change-in-production")
DEBUG = os.environ.get("DEBUG", "0") == "1"
ALLOWED_HOSTS = os.environ.get("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")

INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.auth",
    "rest_framework",
    "corsheaders",
    "app.jobs",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
]

ROOT_URLCONF = "app.urls"
WSGI_APPLICATION = "app.wsgi.application"

DATABASES = {
    "default": dj_database_url.config(
        default="postgres://jobs:jobs@localhost:5432/jobsdb",
        conn_max_age=600,
    )
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_PAGINATION_CLASS": "app.pagination.JobPagination",
    "PAGE_SIZE": 20,
}

# Allow Vite dev server in local development; nginx proxy handles production.
CORS_ALLOWED_ORIGINS = ["http://localhost:5173"]

USE_TZ = True
TIME_ZONE = "UTC"
