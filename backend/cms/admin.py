from django import forms
from django.apps import apps
from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import GroupAdmin, UserAdmin
from django.contrib.auth.models import Group
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from unfold.admin import ModelAdmin
from unfold.forms import AdminPasswordChangeForm, UserChangeForm, UserCreationForm

from .models import ContentRevision, IssuedToken, Lead, MediaAsset, RevokedToken, SiteContent
from .validators import validate_phone

admin.site.site_header = "TerraKlink Admin"
admin.site.site_title = "TerraKlink Admin"
admin.site.index_title = "Управление сайтом"


def permission_label(permission):
    action = {
        "add": "Добавление",
        "change": "Изменение",
        "delete": "Удаление",
        "view": "Просмотр",
    }.get(permission.codename.split("_")[0])
    model = permission.content_type.model_class()
    name = model._meta.verbose_name if model else permission.content_type.name
    token_names = {"outstandingtoken": "выданный токен", "blacklistedtoken": "отозванный токен"}
    name = token_names.get(permission.content_type.model, name)
    app_name = (
        "Управление токенами"
        if permission.content_type.app_label == "token_blacklist"
        else apps.get_app_config(permission.content_type.app_label).verbose_name
    )
    return f"{app_name} | {name} | {action}" if action else permission.name


class RussianPermissionsMixin:
    def formfield_for_manytomany(self, db_field, request, **kwargs):
        field = super().formfield_for_manytomany(db_field, request, **kwargs)
        if field and db_field.name in ("permissions", "user_permissions"):
            field.label_from_instance = permission_label
        return field


admin.site.unregister(get_user_model())
admin.site.unregister(Group)


@admin.register(get_user_model())
class RussianUserAdmin(RussianPermissionsMixin, UserAdmin, ModelAdmin):
    form = UserChangeForm
    add_form = UserCreationForm
    change_password_form = AdminPasswordChangeForm


@admin.register(Group)
class RussianGroupAdmin(RussianPermissionsMixin, GroupAdmin, ModelAdmin):
    pass


class LeadAdminForm(forms.ModelForm):
    class Meta:
        model = Lead
        fields = "__all__"

    def clean_phone(self):
        value = self.cleaned_data["phone"]
        validate_phone(value)
        return value


@admin.register(Lead)
class LeadAdmin(ModelAdmin):
    form = LeadAdminForm
    list_display = ["name", "phone", "region", "status", "created_at"]
    list_filter = ["status", "created_at"]
    search_fields = ["name", "phone"]
    readonly_fields = ["consent_version", "consent_at", "created_at"]


@admin.register(ContentRevision)
class RevisionAdmin(ModelAdmin):
    list_display = ["number", "action", "editor", "created_at"]
    readonly_fields = ["site", "number", "snapshot", "action", "editor", "created_at"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(SiteContent)
class SiteAdmin(ModelAdmin):
    readonly_fields = ["key", "draft", "published", "revision", "published_revision", "updated_at"]

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(MediaAsset)
class MediaAdmin(ModelAdmin):
    list_display = ["name", "kind", "created_at"]
    readonly_fields = ["file", "kind", "name", "uploaded_by", "created_at"]

    def has_add_permission(self, request):
        return False


for token_model in (OutstandingToken, BlacklistedToken):
    if admin.site.is_registered(token_model):
        admin.site.unregister(token_model)


@admin.register(IssuedToken)
class IssuedTokenAdmin(ModelAdmin):
    list_display = ["id", "owner", "issued_at", "expires"]
    readonly_fields = ["id", "owner", "identifier", "issued_at", "expires"]
    fields = readonly_fields
    actions = ["revoke"]

    @admin.display(description="Пользователь")
    def owner(self, obj):
        return obj.user

    @admin.display(description="Идентификатор")
    def identifier(self, obj):
        return obj.jti

    @admin.display(description="Выдан")
    def issued_at(self, obj):
        return obj.created_at

    @admin.display(description="Действует до")
    def expires(self, obj):
        return obj.expires_at

    @admin.action(description="Отозвать выбранные токены", permissions=["change"])
    def revoke(self, request, queryset):
        for token in queryset:
            BlacklistedToken.objects.get_or_create(token=token)
        self.message_user(request, "Выбранные токены отозваны.")

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(RevokedToken)
class RevokedTokenAdmin(ModelAdmin):
    list_display = ["id", "token_reference", "revoked_at"]
    readonly_fields = ["token_reference", "revoked_at"]
    fields = readonly_fields

    @admin.display(description="Токен")
    def token_reference(self, obj):
        return f"Токен №{obj.token_id}"

    @admin.display(description="Отозван")
    def revoked_at(self, obj):
        return obj.blacklisted_at

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


from . import product_admin  # noqa: E402, F401
