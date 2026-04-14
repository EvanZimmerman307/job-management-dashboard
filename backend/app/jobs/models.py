from django.db import models


class Job(models.Model):
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Job({self.pk}, {self.name!r})"


class JobStatus(models.Model):
    class StatusType(models.TextChoices):
        PENDING = "PENDING", "Pending"
        RUNNING = "RUNNING", "Running"
        COMPLETED = "COMPLETED", "Completed"
        FAILED = "FAILED", "Failed"

    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name="statuses")
    status_type = models.CharField(max_length=20, choices=StatusType.choices)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["job", "-timestamp"]),
        ]

    def __str__(self) -> str:
        return f"JobStatus({self.job_id}, {self.status_type}, {self.timestamp})"
