import json
from pathlib import Path

from django.core.management.base import BaseCommand

from cms.models import SiteContent
from cms.serializers import DocumentSerializer


class Command(BaseCommand):
    help = "Create the demonstration site once; never overwrite editor changes."

    def handle(self, *args, **options):
        document = json.loads(
            (Path(__file__).resolve().parents[2] / "seed.json").read_text(encoding="utf-8")
        )
        validator = DocumentSerializer(data=document)
        validator.is_valid(raise_exception=True)
        _, created = SiteContent.objects.get_or_create(
            key="main", defaults={"draft": document, "published": document, "published_revision": 1}
        )
        self.stdout.write("Demo content initialized" if created else "Existing content preserved")
