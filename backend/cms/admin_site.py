from unfold.sites import UnfoldAdminSite


class TerraAdminSite(UnfoldAdminSite):
    def get_app_list(self, request, app_label=None):
        apps = super().get_app_list(request, app_label)
        groups = {"Владельцу сайта": [], "Система": []}
        for app in apps:
            for model in app["models"]:
                group = (
                    "Владельцу сайта" if model["object_name"] in {"Product", "Lead"} else "Система"
                )
                groups[group].append(model)
        return [
            {
                "name": title,
                "app_label": "cms",
                "app_url": "/django-admin/",
                "has_module_perms": True,
                "models": models,
            }
            for title, models in groups.items()
            if models
        ]
