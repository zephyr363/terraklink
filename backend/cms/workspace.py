"""Staff workspaces and consent-based counters; never store visitor identifiers."""

from datetime import timedelta

from django.db import transaction
from django.db.models import Count, F, Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .models import AnalyticsCounter, ContentRevision, Lead, MediaAsset
from .serializers import DocumentSerializer
from .services import update_content


class EventSerializer(serializers.Serializer):
    consent_version = serializers.ChoiceField(choices=["2026-10-16"])
    consent = serializers.BooleanField()
    event = serializers.ChoiceField(choices=["page_view", "product_view", "lead_sent"])
    path = serializers.RegexField(
        r"^/(?:catalog(?:/[a-zA-Z0-9_-]{1,80})?|projects|contacts|information|about|dealers|legal/(?:privacy|cookies|terms|consent))?$"
    )
    language = serializers.ChoiceField(choices=["ru", "kk"])

    def validate_consent(self, value):
        if not value:
            raise serializers.ValidationError("Для аналитики необходимо согласие.")
        return value


class EventsView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "analytics"

    def post(self, request):
        serializer = EventSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        # One row per day/path/event/language; unique constraint handles concurrent creation.
        with transaction.atomic():
            counter, _ = AnalyticsCounter.objects.get_or_create(
                day=timezone.localdate(timezone=timezone.get_fixed_timezone(300)),
                path=data["path"],
                event=data["event"],
                language=data["language"],
            )
            AnalyticsCounter.objects.filter(pk=counter.pk).update(count=F("count") + 1)
        return Response(status=204)


class StaffWorkspaceView(APIView):
    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)
        response["Cache-Control"] = "no-store"
        return response


class AnalyticsView(StaffWorkspaceView):
    def get(self, request):
        days = serializers.IntegerField(min_value=1, max_value=90).run_validation(
            request.query_params.get("days", 30)
        )
        today = timezone.localdate(timezone=timezone.get_fixed_timezone(300))
        rows = AnalyticsCounter.objects.filter(day__gte=today - timedelta(days=days - 1))
        return Response(
            {
                "days": days,
                "totals": list(rows.values("event").annotate(count=Sum("count"))),
                "daily": list(
                    rows.filter(event="page_view")
                    .values("day")
                    .annotate(count=Sum("count"))
                    .order_by("day")
                ),
                "truncated": rows.count() > 2000,
                "counters": list(
                    rows.order_by("day", "path", "event").values(
                        "day", "path", "event", "language", "count"
                    )[:2000]
                ),
                "leads": list(Lead.objects.values("status").annotate(count=Count("id"))),
            }
        )


class HistoryView(StaffWorkspaceView):
    def get(self, request):
        rows = ContentRevision.objects.filter(site__key="main").order_by("-number")[:100]
        return Response(list(rows.values("number", "action", "created_at", "editor__username")))


class RestoreView(StaffWorkspaceView):
    def post(self, request):
        number = serializers.IntegerField(min_value=1).run_validation(request.data.get("number"))
        revision = serializers.IntegerField(min_value=1).run_validation(
            request.data.get("revision")
        )
        source = get_object_or_404(ContentRevision, site__key="main", number=number)
        document = DocumentSerializer(data=source.snapshot)
        document.is_valid(raise_exception=True)
        # Restore creates a new draft revision; publication remains an explicit editor action.
        site = update_content(
            expected_revision=revision, document=document.validated_data, editor=request.user
        )
        return Response({"revision": site.revision})


class LeadStatusView(StaffWorkspaceView):
    def patch(self, request, pk):
        value = serializers.ChoiceField(choices=["new", "done"]).run_validation(
            request.data.get("status")
        )
        lead = get_object_or_404(Lead, pk=pk)
        lead.status = value
        lead.save(update_fields=["status"])
        return Response({"id": lead.pk, "status": lead.status})


class MediaLibraryView(StaffWorkspaceView):
    def get(self, request):
        assets = MediaAsset.objects.order_by("-created_at")[:200]
        return Response(
            [
                {
                    "id": asset.pk,
                    "name": asset.name,
                    "kind": asset.kind,
                    "url": asset.file.url,
                    "created_at": asset.created_at,
                }
                for asset in assets
            ]
        )
