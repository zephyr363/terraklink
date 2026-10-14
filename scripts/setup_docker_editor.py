"""Reuse the local development editor password in the isolated Compose database."""
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parent.parent
password_path = root / ".local/admin-password.txt"
if not password_path.exists():
    raise SystemExit("Run uv run scripts/setup_dev.py first, or use createsuperuser interactively")
source = """
import sys
from django.conf import settings
from django.contrib.auth import get_user_model
if not settings.DEBUG:
    raise RuntimeError('This bootstrap is for local development only')
user, created = get_user_model().objects.get_or_create(username='editor', defaults={'is_staff': True, 'is_superuser': True})
if created:
    user.set_password(sys.stdin.read().strip())
    user.save()
print('Local Compose editor ready; existing credentials preserved')
"""
subprocess.run(["docker", "compose", "exec", "-T", "backend", "python", "manage.py", "shell", "-c", source],
               input=password_path.read_text(encoding="utf-8"), text=True, cwd=root, check=True)
