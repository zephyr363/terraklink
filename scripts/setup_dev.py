"""Create a local editor with a random password; the password never enters source control."""
import os
import secrets
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "backend"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
os.environ.setdefault("DJANGO_DEBUG", "1")
import django
django.setup()
from django.contrib.auth import get_user_model

if __name__ == "__main__":
    path = ROOT / ".local/admin-password.txt"
    user, created = get_user_model().objects.get_or_create(username="editor",
        defaults={"is_staff": True, "is_superuser": True})
    if created:
        password = secrets.token_urlsafe(24)
        user.set_password(password)
        user.save()
        path.parent.mkdir(exist_ok=True)
        path.write_text(password, encoding="utf-8")
    print("Local editor: editor")
    print(f"Password file: {path}" if path.exists() else "User already exists; password unchanged")
