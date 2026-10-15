"""Back up PostgreSQL and MinIO volumes through Compose; secrets stay inside containers."""

import argparse
import subprocess
from datetime import datetime, timezone
from pathlib import Path

root = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--production", action="store_true")
parser.add_argument("--output", type=Path, default=root / "backups")
args = parser.parse_args()
compose = ["docker", "compose"]
if args.production:
    compose += ["--env-file", str(root / ".env.production"), "-f", "compose.production.yml"]
folder = args.output.resolve() / datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S-%f")
folder.mkdir(parents=True)
commands = {
    "postgres.dump": [
        "postgres",
        "sh",
        "-c",
        'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc',
    ],
    "minio.tar.gz": ["minio", "tar", "-C", "/data", "-czf", "-", "."],
}
try:
    for name, command in commands.items():
        with (folder / name).open("wb") as output:
            subprocess.run([*compose, "exec", "-T", *command], cwd=root, stdout=output, check=True)
        if not (folder / name).stat().st_size:
            raise RuntimeError("Empty backup: " + name)
    (folder / "COMPLETE").write_text("PostgreSQL and MinIO backups completed.\n", encoding="utf-8")
except Exception:
    print("Backup incomplete; do not use it for recovery:", folder)
    raise
print("Backup completed:", folder)
