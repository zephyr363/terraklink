#!/bin/sh
# Compose waits for dependencies. Stop immediately if any preparation step fails.
set -eu
if [ "${DJANGO_DEBUG:-0}" != "1" ]; then
    python manage.py check --deploy --fail-level WARNING
fi
python manage.py init_storage
python manage.py migrate --noinput
python manage.py seed_content
python manage.py collectstatic --noinput
exec gunicorn config.wsgi:application --bind 0.0.0.0:8000 \
    --workers "${GUNICORN_WORKERS:-3}" --timeout "${GUNICORN_TIMEOUT:-60}" --access-logfile -
