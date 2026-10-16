"""Role-aware navigation separates business tasks from technical records."""

from django.urls import reverse


def navigation(request):
    groups = [
        (
            "Владельцу сайта",
            [("Продукция", "cms.product", "inventory_2"), ("Заявки", "cms.lead", "contact_phone")],
        ),
        (
            "Система",
            [
                ("Медиафайлы", "cms.mediaasset", "perm_media"),
                ("Содержимое сайта", "cms.sitecontent", "description"),
                ("История редакций", "cms.contentrevision", "history"),
                ("Выданные токены", "cms.issuedtoken", "key"),
                ("Отозванные токены", "cms.revokedtoken", "lock"),
                ("Пользователи", "auth.user", "person"),
                ("Группы", "auth.group", "group"),
            ],
        ),
    ]
    result = []
    for title, entries in groups:
        items = []
        for label, model, icon in entries:
            app, name = model.split(".")
            if request.user.has_perm(f"{app}.view_{name}") or request.user.has_perm(
                f"{app}.change_{name}"
            ):
                items.append(
                    {
                        "title": label,
                        "icon": icon,
                        "link": reverse(f"admin:{app}_{name}_changelist"),
                    }
                )
        if items:
            result.append({"title": title, "separator": True, "items": items})
    result.append(
        {
            "title": "Сайт",
            "items": [{"title": "Редактор и публикация", "icon": "edit", "link": "/admin"}],
        }
    )
    return result
