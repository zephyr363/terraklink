# Как вносить изменения

## Первый запуск

Нужны Git, uv, Node.js 24/npm и Docker Desktop (Linux containers). Начинайте из
корня репозитория. Python-зависимости устанавливаются только через uv.

```powershell
git switch dev
git pull --ff-only origin dev
uv sync --frozen
cd frontend
npm ci
cd ..
uv run --frozen scripts/prepare_env.py
docker compose up --build -d --wait
```

Сайт — http://localhost:80, редактор — http://localhost:80/admin.
Если редактора ещё нет: `docker compose exec backend python manage.py createsuperuser`.
Пароли и `.env` остаются локальными. На существующих данных подготовительные
команды не перезаписывают контент. Не используйте `down -v` для обновления.

## Где менять код

| Задача | Файлы |
|---|---|
| Текст, фото, порядок секций на своём сайте | `/admin`, без изменения кода |
| Типы документа, порядок, фильтры | `frontend/src/domain/` |
| Список и поля секций | `frontend/src/features/editor/` |
| Общая форма входа | `frontend/src/features/auth/Login.tsx` |
| Аналитика / управление | `frontend/src/features/analytics/`, `features/management/` |
| Запросы рабочих приложений | `frontend/src/store/workspaceApi.ts` |
| Публичные карточки и галереи | `frontend/src/components/` |
| Страницы и сборка интерфейса | `frontend/src/pages/` |
| Серверные правила документа | `backend/cms/serializers.py`, `validators.py` |
| Транзакции черновика/публикации | `backend/cms/services.py` |
| События, история, медиатека, статусы | `backend/cms/workspace.py` |
| Модели и миграции | `backend/cms/models.py`, `migrations/` |
| Запуск контейнера и proxy | `infra/`, `backend/Dockerfile`, Compose-файлы |

Страница связывает компоненты и состояние; компонент отображает данные и вызывает
переданный callback; чистая функция в `domain/` проверяет или преобразует данные.
RTK Query отвечает за сеть и кеш. Backend повторно валидирует всё перед записью.

### Пример: добавить поле товара

1. Опишите поле в `domain/content.ts` и его проверку в `cms/serializers.py`.
2. Если нужно, добавьте клиентскую проверку в `domain/validation.ts`.
3. Добавьте подписанное поле в `components/ProductEditor.tsx` и публичное отображение.
4. Добавьте русский/казахский текст интерфейса в `i18n/kk.json`.
5. Проверьте старый документ без этого поля, сохранение, публикацию и неверный ввод.

Новые поля JSON обычно делайте необязательными: существующие документы должны
сохраняться. Модель БД меняйте миграцией через `uv run --frozen backend/manage.py makemigrations`.
Не редактируйте опубликованный seed ради изменения данных работающего клиента.

## Быстрая разработка без пересборки контейнеров

В одном терминале из корня:

```powershell
$env:DJANGO_DEBUG='1'
uv run --frozen backend/manage.py migrate
uv run --frozen backend/manage.py seed_content
uv run --frozen scripts/setup_dev.py
uv run --frozen backend/manage.py runserver 127.0.0.1:8000
```

В другом — `cd frontend`, `npm run dev`. Интерфейс открыт на
http://127.0.0.1:5173; Vite проксирует API в порт 8000. SQLite/медиа разработки
отдельны от Docker volumes. Рабочие данные не подменяйте тестовыми.

## Проверки

Из корня, с `DJANGO_DEBUG=1`:

```powershell
uv run --frozen ruff check backend
uv run --frozen pytest
uv run --frozen backend/manage.py makemigrations --check --dry-run
cd frontend
npm run build
npm test
```

Дополнительно проверяйте изменённые служебные скрипты: `uv run --frozen ruff check scripts/имя_скрипта.py`.

### Браузерные тесты без риска для данных

Остановите свой сервер разработки на 8000. В PowerShell из корня:

```powershell
$env:DJANGO_DEBUG='1'
$env:DJANGO_SETTINGS_MODULE='config.browser_tests'
$env:E2E_EDITOR_PASSWORD='TestOnly-Browser-Password-42!'
uv run --frozen scripts/prepare_browser_tests.py
uv run --frozen backend/manage.py runserver 127.0.0.1:8000 --noreload
```

В другом терминале с тем же `E2E_EDITOR_PASSWORD`: `cd frontend`,
`npx playwright install chromium`, `npm run dev`. В третьем терминале с той же
переменной пароля: `cd frontend`, `npm run test:e2e`.
Тесты записывают данные только в `.local/browser-tests/`. Не направляйте
изменяющие E2E на localhost:80 с данными клиента. После тестов остановите QA-сервер.

Alpine-вариант Python можно проверить независимо:

```powershell
docker build --target test -f backend/Dockerfile -t terraklink-api:test .
docker run --rm terraklink-api:test
```

## Коммит и pull request

Разработка идёт в `dev`. `main` обновляется только через PR после успешных `api`
и `web`, по запросу владельца. Перед каждым коммитом:

```powershell
git diff
git add <только-файлы-вашего-изменения>
git diff --cached
uv run --frozen scripts/check_staged_secrets.py
git diff --cached --check
git commit -m "Конкретное изменение"
```

В PR опишите задачу, итоговое поведение и проверки. Для интерфейса приложите
скриншот. `.env`, `.local`, базы, uploads, backups и артефакты Graphify не входят
в коммит. Локальный `graphify-out/` — подсказка для навигации, исходный код и тесты
остаются основанием для изменений.

Для актуальной Django Unfold необходим Python 3.12 или новее; Docker использует Python 3.13.
