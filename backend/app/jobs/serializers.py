from rest_framework import serializers

from .models import Job, JobStatus


class JobSerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()

    class Meta:
        model = Job
        fields = ["id", "name", "status", "created_at", "updated_at"]
        read_only_fields = ["id", "status", "created_at", "updated_at"]

    def get_status(self, obj: Job) -> str | None:
        # current_status is annotated by the queryset in views; fall back to
        # a direct DB lookup only when the serializer is used outside the list
        # view (e.g. in the POST response path).
        current_status = getattr(obj, "current_status", None)
        if current_status is not None:
            return current_status
        latest = obj.statuses.first()
        return latest.status_type if latest else None


class JobPatchSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=JobStatus.StatusType.choices)
