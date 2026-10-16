"""Audit the Git index for local data and credentials without printing secret values."""

import re
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parent.parent
staged = subprocess.check_output(
    ["git", "diff", "--cached", "--name-only", "--diff-filter=ACMRT", "-z"], cwd=root
)
paths = [path.decode("utf-8") for path in staged.split(b"\0") if path]
secrets = []
for env_file in root.glob(".env*"):
    if not env_file.is_file() or env_file.name.endswith(".example"):
        continue
    for line in env_file.read_text(encoding="utf-8").splitlines():
        if "=" in line and not line.lstrip().startswith("#"):
            key, value = line.split("=", 1)
            if any(word in key.upper() for word in ("SECRET", "PASSWORD", "TOKEN", "PRIVATE_KEY")):
                value = value.strip().strip("\"'")
                if len(value) >= 8:
                    secrets.append(value.encode())
password_file = root / ".local/admin-password.txt"
if password_file.exists():
    secrets.append(password_file.read_bytes().strip())
forbidden = re.compile(
    r"(^|/)(\.local|\.venv|node_modules|__pycache__|media|staticfiles|backups|test-results|playwright-report)(/|$)|(^|/)\.env(?![^/]*\.example$)($|\.)|\.(sqlite3?|log|dump|pem|key|p12|pfx)$|^docs/screenshots/|^frontend/dist/"
)
token_patterns = [
    rb"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----",
    rb"\bAKIA[0-9A-Z]{16}\b",
    rb"\bgh[pousr]_[A-Za-z0-9]{30,}\b",
    rb"\bgithub_pat_[A-Za-z0-9_]{40,}\b",
    rb"\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}\b",
    rb"\bxox[baprs]-[A-Za-z0-9-]{20,}\b",
]
findings = []
for path in paths:
    if forbidden.search(path):
        findings.append((path, "local/private file"))
    content = subprocess.check_output(["git", "show", f":{path}"], cwd=root)
    if any(secret and secret in content for secret in secrets):
        findings.append((path, "matches an actual local secret"))
    if any(re.search(pattern, content) for pattern in token_patterns):
        findings.append((path, "credential signature"))
if findings:
    for path, reason in findings:
        print(f"BLOCKED: {path}: {reason}")
    raise SystemExit(1)
print(
    f"PASS: {len(paths)} staged files; no local data, known local secrets or credential signatures"
)
