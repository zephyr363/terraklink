"""Atomic content commands. Compare-and-swap also works on SQLite in local development."""

import json

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import APIException

from .models import ContentRevision, SiteContent


class RevisionConflict(APIException):
    status_code = 409
    default_detail = "Контент изменён другим редактором. Загрузите актуальную версию."


@transaction.atomic
def update_content(*, expected_revision, editor, document=None, publish=False):
    site = SiteContent.objects.get(key="main")
    if site.revision != expected_revision:
        raise RevisionConflict()
    # DRF Decimal values must be normalized before persisting a JSON document.
    snapshot = json.loads(json.dumps(document if document is not None else site.draft, default=str))
    changes = {"revision": expected_revision + 1, "updated_at": timezone.now()}
    if publish:
        changes.update(published=snapshot, published_revision=expected_revision + 1)
    else:
        changes["draft"] = snapshot
    if not SiteContent.objects.filter(pk=site.pk, revision=expected_revision).update(**changes):
        raise RevisionConflict()
    # Synchronize the native Product/ProductImage projection inside the same atomic
    # transaction so a catalog failure rolls back the content revision too.
    if not publish:
        from .catalog import sync_products

        sync_products(snapshot)
    ContentRevision.objects.create(
        site=site,
        number=expected_revision + 1,
        snapshot=snapshot,
        action="publish" if publish else "save",
        editor=editor,
    )
    site.refresh_from_db()
    return site
