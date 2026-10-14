from django.contrib import admin

from .models import ContentRevision, Lead, MediaAsset, SiteContent


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ["name", "phone", "region", "status", "created_at"]
    list_filter = ["status", "created_at"]
    search_fields = ["name", "phone"]
    readonly_fields = ["consent_version", "consent_at", "created_at"]


@admin.register(ContentRevision)
class RevisionAdmin(admin.ModelAdmin):
    list_display = ["number", "action", "editor", "created_at"]
    readonly_fields = ["site", "number", "snapshot", "action", "editor", "created_at"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(SiteContent)
class SiteAdmin(admin.ModelAdmin):
    readonly_fields = ["key", "draft", "published", "revision", "published_revision", "updated_at"]

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(MediaAsset)
class MediaAdmin(admin.ModelAdmin):
    list_display = ["name", "kind", "created_at"]
    readonly_fields = ["file", "kind", "name", "uploaded_by", "created_at"]

    def has_add_permission(self, request):
        return False
