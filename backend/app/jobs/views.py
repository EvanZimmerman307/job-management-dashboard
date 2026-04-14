from django.db import transaction
from django.db.models import OuterRef, QuerySet, Subquery
from rest_framework import status
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.request import Request
from rest_framework.response import Response

from .models import Job, JobStatus
from .serializers import JobPatchSerializer, JobSerializer


def _annotated_queryset() -> QuerySet[Job]:
    """Return a Job queryset annotated with the latest status_type per job."""
    latest_status = (
        JobStatus.objects.filter(job=OuterRef("pk"))
        .order_by("-timestamp")
        .values("status_type")[:1]
    )
    return Job.objects.annotate(current_status=Subquery(latest_status))


class JobListCreateView(ListCreateAPIView):
    serializer_class = JobSerializer

    def get_queryset(self) -> QuerySet[Job]:
        qs = _annotated_queryset()
        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(current_status=status_param)
        ordering = self.request.query_params.get("ordering", "-created_at")
        if ordering in {"name", "-name", "created_at", "-created_at"}:
            qs = qs.order_by(ordering)
        return qs

    def perform_create(self, serializer: JobSerializer) -> None:
        with transaction.atomic():
            job: Job = serializer.save()
            JobStatus.objects.create(
                job=job, status_type=JobStatus.StatusType.PENDING
            )


class JobDetailView(RetrieveUpdateDestroyAPIView):
    serializer_class = JobSerializer
    http_method_names = ["get", "patch", "delete"]

    def get_queryset(self) -> QuerySet[Job]:
        return _annotated_queryset()

    def partial_update(self, request: Request, *args: object, **kwargs: object) -> Response:
        job: Job = self.get_object()
        patch_serializer = JobPatchSerializer(data=request.data)
        patch_serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            JobStatus.objects.create(
                job=job,
                status_type=patch_serializer.validated_data["status"],
            )
            job.save()  # refresh updated_at
        updated_job = _annotated_queryset().get(pk=job.pk)
        return Response(self.get_serializer(updated_job).data)
