FROM python:3.13-alpine AS base
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
WORKDIR /app

FROM base AS dependencies
COPY --from=ghcr.io/astral-sh/uv:0.9.20 /uv /bin/uv
COPY pyproject.toml uv.lock ./
RUN UV_COMPILE_BYTECODE=1 uv sync --frozen --no-dev --no-editable

# Optional test target keeps pytest, Ruff and uv out of the runtime image.
FROM dependencies AS test
RUN apk add --no-cache git
RUN uv sync --frozen --group dev --no-editable
COPY backend ./backend
COPY scripts ./scripts
ENV DJANGO_DEBUG=1
CMD ["uv", "run", "--frozen", "pytest", "-q"]

FROM base AS runtime
COPY --from=dependencies /app/.venv /app/.venv
RUN addgroup -S -g 1000 app && adduser -S -D -u 1000 -G app app \
    && mkdir -p /app/backend/staticfiles && chown app:app /app/backend/staticfiles
COPY backend/manage.py ./backend/manage.py
COPY backend/cms ./backend/cms
COPY backend/config ./backend/config
COPY backend/templates ./backend/templates
COPY --chmod=755 infra/backend-start.sh /usr/local/bin/backend-start
USER app
WORKDIR /app/backend
ENV PATH="/app/.venv/bin:$PATH"
EXPOSE 8000
CMD ["backend-start"]
