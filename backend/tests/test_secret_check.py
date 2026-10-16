"""Exercise the index scanner on a temporary Git repository, never the real index."""

import shutil
import subprocess
import sys
from pathlib import Path


def scanner_repo(tmp_path):
    source = Path(__file__).resolve().parents[2] / "scripts/check_staged_secrets.py"
    # The Alpine test image copies backend and scripts together.
    target = tmp_path / "scripts/check_staged_secrets.py"
    target.parent.mkdir()
    shutil.copyfile(source, target)
    subprocess.run(["git", "init", "-q", str(tmp_path)], check=True)
    return target


def test_secret_scanner_accepts_staged_deletion(tmp_path):
    target = scanner_repo(tmp_path)
    old = tmp_path / "old.txt"
    old.write_text("public documentation", encoding="utf-8")
    subprocess.run(["git", "add", "old.txt"], cwd=tmp_path, check=True)
    subprocess.run(
        [
            "git",
            "-c",
            "user.name=Test",
            "-c",
            "user.email=test@example.invalid",
            "commit",
            "-qm",
            "test fixture",
        ],
        cwd=tmp_path,
        check=True,
    )
    old.unlink()
    subprocess.run(["git", "add", "-u"], cwd=tmp_path, check=True)
    result = subprocess.run([sys.executable, str(target)], capture_output=True, text=True)
    assert result.returncode == 0
    assert "PASS" in result.stdout


def test_secret_scanner_blocks_index_content_without_printing_value(tmp_path):
    target = scanner_repo(tmp_path)
    secret = "TestOnly-Scanner-Sentinel-42!"
    (tmp_path / ".env").write_text("APP_PASSWORD=" + secret, encoding="utf-8")
    (tmp_path / "notes.md").write_text(secret, encoding="utf-8")
    subprocess.run(["git", "add", "notes.md"], cwd=tmp_path, check=True)
    result = subprocess.run([sys.executable, str(target)], capture_output=True, text=True)
    assert result.returncode == 1
    assert "matches an actual local secret" in result.stdout
    assert secret not in result.stdout + result.stderr
