"""Create demo content and a test editor exclusively in the isolated browser-test DB."""

import os
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
password = os.getenv("E2E_EDITOR_PASSWORD")
if not password:
    raise SystemExit("Set E2E_EDITOR_PASSWORD to a test-only password first.")
sys.path.insert(0, str(root / "backend"))
os.environ["DJANGO_SETTINGS_MODULE"] = "config.browser_tests"
os.environ["DJANGO_DEBUG"] = "1"

import django  # noqa: E402

django.setup()
from django.conf import settings  # noqa: E402
from django.contrib.auth import get_user_model  # noqa: E402
from django.core.management import call_command  # noqa: E402

assert Path(settings.DATABASES["default"]["NAME"]).resolve().is_relative_to(root / ".local")
call_command("migrate", interactive=False, verbosity=0)
call_command("seed_content")
editor, _ = get_user_model().objects.get_or_create(username="editor")
editor.is_staff = True
editor.is_superuser = True
editor.set_password(password)
editor.save()
print("Isolated browser-test database ready; test password was not printed.")
