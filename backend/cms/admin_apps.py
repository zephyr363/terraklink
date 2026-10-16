from django.contrib.admin.apps import AdminConfig


class TerraAdminConfig(AdminConfig):
    default_site = "cms.admin_site.TerraAdminSite"
