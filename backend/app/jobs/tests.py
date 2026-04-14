from django.test import TestCase
from rest_framework.test import APIClient

from .models import Job, JobStatus


def make_job(name: str = "Test Job", status: str = JobStatus.StatusType.PENDING) -> Job:
    """Create a job with an initial status row."""
    job = Job.objects.create(name=name)
    JobStatus.objects.create(job=job, status_type=status)
    return job


class CreateJobTests(TestCase):
    def setUp(self) -> None:
        self.client = APIClient()

    def test_create_job_returns_201_with_pending_status(self) -> None:
        res = self.client.post("/api/jobs/", {"name": "My Job"}, format="json")
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["name"], "My Job")
        self.assertEqual(res.data["status"], "PENDING")
        self.assertTrue(JobStatus.objects.filter(job_id=res.data["id"]).exists())

    def test_create_job_blank_name_returns_400(self) -> None:
        res = self.client.post("/api/jobs/", {"name": ""}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("name", res.data)

    def test_create_job_missing_name_returns_400(self) -> None:
        res = self.client.post("/api/jobs/", {}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("name", res.data)

    def test_create_job_name_too_long_returns_400(self) -> None:
        res = self.client.post("/api/jobs/", {"name": "x" * 256}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("name", res.data)

    def test_create_job_creates_exactly_one_status_row(self) -> None:
        res = self.client.post("/api/jobs/", {"name": "Atomic Job"}, format="json")
        self.assertEqual(res.status_code, 201)
        count = JobStatus.objects.filter(job_id=res.data["id"]).count()
        self.assertEqual(count, 1)


class ListJobsTests(TestCase):
    def setUp(self) -> None:
        self.client = APIClient()

    def test_list_returns_paginated_shape(self) -> None:
        make_job("Job A")
        res = self.client.get("/api/jobs/")
        self.assertEqual(res.status_code, 200)
        for key in ("count", "next", "previous", "results"):
            self.assertIn(key, res.data)
        self.assertEqual(res.data["count"], 1)

    def test_filter_by_status_returns_only_matching_jobs(self) -> None:
        make_job("Pending Job", JobStatus.StatusType.PENDING)
        make_job("Running Job", JobStatus.StatusType.RUNNING)
        res = self.client.get("/api/jobs/?status=PENDING")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["count"], 1)
        self.assertEqual(res.data["results"][0]["name"], "Pending Job")

    def test_filter_by_invalid_status_returns_empty_list(self) -> None:
        make_job()
        res = self.client.get("/api/jobs/?status=NONSENSE")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["count"], 0)

    def test_ordering_by_name_is_alphabetical(self) -> None:
        make_job("Zebra")
        make_job("Apple")
        res = self.client.get("/api/jobs/?ordering=name")
        self.assertEqual(res.status_code, 200)
        names = [j["name"] for j in res.data["results"]]
        self.assertEqual(names, sorted(names))

    def test_invalid_ordering_param_does_not_crash(self) -> None:
        make_job()
        res = self.client.get("/api/jobs/?ordering=malicious;DROP TABLE jobs")
        self.assertEqual(res.status_code, 200)


class PatchJobTests(TestCase):
    def setUp(self) -> None:
        self.client = APIClient()

    def test_patch_valid_status_returns_200_and_new_status(self) -> None:
        job = make_job()
        res = self.client.patch(f"/api/jobs/{job.pk}/", {"status": "RUNNING"}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["status"], "RUNNING")

    def test_patch_creates_new_status_row_not_update(self) -> None:
        job = make_job()
        self.client.patch(f"/api/jobs/{job.pk}/", {"status": "RUNNING"}, format="json")
        self.assertEqual(JobStatus.objects.filter(job=job).count(), 2)

    def test_patch_reflects_latest_status_after_multiple_updates(self) -> None:
        job = make_job()
        self.client.patch(f"/api/jobs/{job.pk}/", {"status": "RUNNING"}, format="json")
        res = self.client.patch(f"/api/jobs/{job.pk}/", {"status": "COMPLETED"}, format="json")
        self.assertEqual(res.data["status"], "COMPLETED")
        self.assertEqual(JobStatus.objects.filter(job=job).count(), 3)

    def test_patch_invalid_status_returns_400(self) -> None:
        job = make_job()
        res = self.client.patch(f"/api/jobs/{job.pk}/", {"status": "INVALID"}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("status", res.data)

    def test_patch_nonexistent_job_returns_404(self) -> None:
        res = self.client.patch("/api/jobs/99999/", {"status": "RUNNING"}, format="json")
        self.assertEqual(res.status_code, 404)


class DeleteJobTests(TestCase):
    def setUp(self) -> None:
        self.client = APIClient()

    def test_delete_returns_204(self) -> None:
        job = make_job()
        res = self.client.delete(f"/api/jobs/{job.pk}/")
        self.assertEqual(res.status_code, 204)
        self.assertFalse(Job.objects.filter(pk=job.pk).exists())

    def test_delete_cascades_to_status_rows(self) -> None:
        job = make_job()
        job_pk = job.pk
        self.client.delete(f"/api/jobs/{job_pk}/")
        self.assertEqual(JobStatus.objects.filter(job_id=job_pk).count(), 0)

    def test_delete_nonexistent_job_returns_404(self) -> None:
        res = self.client.delete("/api/jobs/99999/")
        self.assertEqual(res.status_code, 404)
