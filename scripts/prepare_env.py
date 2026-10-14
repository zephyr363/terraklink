"""Generate ignored development-only Compose credentials without printing secrets."""
import secrets
from pathlib import Path

root = Path(__file__).resolve().parent.parent
target = root / ".env"
if target.exists():
    print("Existing .env preserved")
else:
    content = (root / ".env.example").read_text(encoding="utf-8")
    for placeholder in ["replace-with-a-random-secret-at-least-50-characters-long", "replace-postgres-password", "replace-minio-password"]:
        content = content.replace(placeholder, secrets.token_urlsafe(48))
    target.write_text(content, encoding="utf-8")
    print("Created ignored .env with random development credentials")
