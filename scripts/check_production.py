"""Validate a private production env file and Compose without printing its values."""

import argparse
import os
import re
import subprocess
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--env-file", type=Path, default=root / ".env.production")
parser.add_argument(
    "--allow-localhost", action="store_true", help="For isolated local HTTPS smoke tests only"
)
args = parser.parse_args()
values = {}
for line in args.env_file.read_text(encoding="utf-8").splitlines():
    if line.strip() and not line.lstrip().startswith("#"):
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip()

errors = []
required = (
    "SITE_DOMAIN",
    "ACME_EMAIL",
    "DJANGO_SECRET_KEY",
    "DJANGO_ALLOWED_HOSTS",
    "CSRF_TRUSTED_ORIGINS",
    "POSTGRES_DB",
    "POSTGRES_USER",
    "POSTGRES_PASSWORD",
    "MINIO_ROOT_USER",
    "MINIO_ROOT_PASSWORD",
    "S3_BUCKET",
    "S3_PUBLIC_DOMAIN",
)
for key in required:
    if (
        not values.get(key)
        or "replace-" in values[key]
        or ("example" in values[key] and not args.allow_localhost)
    ):
        errors.append(f"Set {key} to a production value")
if values.get("DJANGO_DEBUG") != "0":
    errors.append("DJANGO_DEBUG must be 0")
for key, minimum in (
    ("DJANGO_SECRET_KEY", 50),
    ("POSTGRES_PASSWORD", 20),
    ("MINIO_ROOT_PASSWORD", 20),
):
    if len(values.get(key, "")) < minimum:
        errors.append(f"{key} must contain at least {minimum} characters")
domain = values.get("SITE_DOMAIN", "")
if not re.fullmatch(r"[a-zA-Z0-9.-]+", domain) or (
    domain == "localhost" and not args.allow_localhost
):
    errors.append("SITE_DOMAIN must be a hostname without a scheme or path")
hosts = values.get("DJANGO_ALLOWED_HOSTS", "").split(",")
if "*" in hosts or domain not in hosts or "127.0.0.1" not in hosts:
    errors.append("DJANGO_ALLOWED_HOSTS must include SITE_DOMAIN and 127.0.0.1, without wildcards")
origins = values.get("CSRF_TRUSTED_ORIGINS", "").split(",")
if f"https://{domain}" not in origins or any(
    not origin.startswith("https://") for origin in origins
):
    errors.append("CSRF_TRUSTED_ORIGINS must contain the HTTPS domain")
if values.get("S3_PUBLIC_DOMAIN") != f"{domain}/storage/{values.get('S3_BUCKET')}":
    errors.append("S3_PUBLIC_DOMAIN must match SITE_DOMAIN/storage/S3_BUCKET")
for key, default in (("MAX_IMAGE_UPLOAD_MB", "10"), ("MAX_VIDEO_UPLOAD_MB", "50")):
    value = values.get(key, default)
    if not value.isdecimal() or not 1 <= int(value) <= 1024:
        errors.append(f"{key} must be between 1 and 1024 MiB")
if errors:
    raise SystemExit("Production configuration is incomplete:\n" + "\n".join(errors))
env = {
    **os.environ,
    **values,
    "DJANGO_TRUST_PROXY_HEADERS": "1",
    "PRODUCTION_ENV_FILE": str(args.env_file.resolve()),
}
subprocess.run(
    [
        sys.executable,
        str(root / "backend/manage.py"),
        "check",
        "--deploy",
        "--fail-level",
        "WARNING",
    ],
    env=env,
    cwd=root,
    check=True,
)
subprocess.run(
    [
        "docker",
        "compose",
        "--env-file",
        str(args.env_file.resolve()),
        "-f",
        "compose.production.yml",
        "config",
        "--quiet",
    ],
    env=env,
    cwd=root,
    check=True,
)
print("PASS: production settings, deployment checks and Compose configuration")
