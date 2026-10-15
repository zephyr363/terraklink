import os
import subprocess
import sys
from pathlib import Path

from cms.errors import DatabaseErrorMiddleware
from django.db import OperationalError


def test_production_security_checks_pass():
    root = Path(__file__).resolve().parents[2]
    env = {
        **os.environ,
        "DJANGO_DEBUG": "0",
        "DJANGO_SECRET_KEY": "TestOnly-Production-Configuration-Secret-For-Checks-1234567890!",
        "DJANGO_ALLOWED_HOSTS": "test.example.kz,127.0.0.1",
        "CSRF_TRUSTED_ORIGINS": "https://test.example.kz",
        "DJANGO_TRUST_PROXY_HEADERS": "1",
        "DJANGO_SETTINGS_MODULE": "config.settings",
    }
    response = subprocess.run(
        [
            sys.executable,
            str(root / "backend/manage.py"),
            "check",
            "--deploy",
            "--fail-level",
            "WARNING",
        ],
        cwd=root,
        env=env,
        capture_output=True,
        text=True,
    )
    assert response.returncode == 0, response.stdout + response.stderr


def test_admin_database_failure_is_branded_and_sanitized():
    response = DatabaseErrorMiddleware(lambda request: None).process_exception(
        None, OperationalError("PRIVATE SQL")
    )
    assert response.status_code == 503
    assert response["Retry-After"] == "5"
    assert b"TerraKlink Admin" in response.content
    assert b"PRIVATE SQL" not in response.content
