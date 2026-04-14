from django.urls import include, path

urlpatterns = [
    path("api/jobs/", include("app.jobs.urls")),
]
