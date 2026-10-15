# Развёртывание на VPS

Production-конфигурация — отдельный `compose.production.yml`, проект `terraklink-production`. Локальный `compose.yml` и его volumes не используются. Изменения выпускаются из `main` после PR и успешных CI `api`/`web`.

## Подготовка сервера

Нужны Linux VPS, Docker Engine с Compose v2, Git, uv, домен с A/AAAA-записями на VPS и доступные извне TCP 80/443. UDP 443 используется для HTTP/3. Если IPv6 не настроен, не публикуйте AAAA-запись. Для данных клиентов используйте согласованное размещение в Казахстане; инфраструктура и юридические документы клиента должны быть утверждены до приёма реальных заявок.

Скопируйте `.env.production.example` в `.env.production` на сервере, ограничьте права файла (`chmod 600 .env.production`) и заполните:

- `SITE_DOMAIN`, `ACME_EMAIL`, `DJANGO_ALLOWED_HOSTS` и `CSRF_TRUSTED_ORIGINS` — действующий домен и HTTPS origin. В allowed hosts оставьте `127.0.0.1` для healthcheck и `backend` для внутренних обращений.
- `DJANGO_SECRET_KEY` — случайный секрет от 50 символов; пароли PostgreSQL и MinIO — новые случайные значения от 20 символов. Не используйте локальные учётные данные.
- `S3_PUBLIC_DOMAIN` — `ваш-домен/storage/имя-bucket`, без схемы. Приватные S3 endpoint и ключи устанавливаются Compose внутри сети.
- `MAX_IMAGE_UPLOAD_MB` и `MAX_VIDEO_UPLOAD_MB` — целые значения 1–1024 MiB. Измените их в одном env-файле и пересоздайте backend/web. API, редактор и Nginx используют эти значения; Nginx добавляет 1 MiB для multipart-запроса. Порог 2 MiB в Django определяет перенос файла из памяти во временный файл, а не допустимый размер загрузки.

`.env.production` и backups исключены из Git. Не выводите полный `docker compose config` с реальными секретами; используйте `config --quiet`.

## Проверка и запуск

Из корня репозитория на VPS:

```bash
uv sync --frozen
uv run --frozen scripts/check_production.py
docker compose --env-file .env.production -f compose.production.yml build
docker compose --env-file .env.production -f compose.production.yml up -d --wait --wait-timeout 180
docker compose --env-file .env.production -f compose.production.yml exec backend python manage.py createsuperuser
```

Проверка конфигурации отклоняет placeholders, небезопасные origin, слабые секреты и недопустимые лимиты. Backend при старте выполняет `check --deploy --fail-level WARNING`, миграции, инициализацию хранилища, создание демонстрационного документа только при его отсутствии и `collectstatic`. Существующие документы seed-команда не перезаписывает. Ошибка проверки останавливает запуск backend.

Caddy получает и обновляет TLS-сертификат, перенаправляет HTTP на HTTPS. Только proxy публикует порты. Gunicorn, PostgreSQL, Redis и MinIO доступны внутри Docker-сети. Nginx передаёт HTTPS-признак, установленный Caddy; доверять этому заголовку безопасно только при отсутствии публичного доступа к backend/web. Redis обеспечивает общий кеш ограничений запросов между Gunicorn workers; ограничение DRF приблизительное, не система защиты от DDoS.

HSTS включён на один час для первого запуска. `DJANGO_HSTS_INCLUDE_SUBDOMAINS=0` и `DJANGO_HSTS_PRELOAD=0` выбраны намеренно: они затрагивают весь домен и требуют решения владельца. Соответствующие рекомендации `security.W005`/`security.W021` явно исключены из блокирующей проверки; остальные предупреждения не исключены. После проверки HTTPS всех поддоменов можно согласовать увеличение HSTS и эти два opt-in. Включение флага preload само по себе не отправляет домен в браузерный список.

Откройте `https://ваш-домен`, `/admin` и `/django-admin/` (TerraKlink Admin). Проверьте оба языка, вход, сохранение черновика и публикацию, загрузку фото/видео. `/api/health/` проверяет подключение к БД. Ошибки и состояние:

```bash
docker compose --env-file .env.production -f compose.production.yml ps
docker compose --env-file .env.production -f compose.production.yml logs --tail 100 backend web proxy
```

Перед реальным запуском замените демонстрационные контакты, предложения и материалы. Перевод встроенного в баннер изображения текста требует отдельного изображения для KZ; его можно загрузить в казахской версии редактора. Переводы юридических текстов остаются проектами для согласования.

## Резервные копии, обновление и восстановление

```bash
uv run --frozen scripts/backup.py --production
```

Создаются PostgreSQL dump в custom format и архив MinIO, без вывода паролей. Маркер `COMPLETE` появляется только после обеих успешных операций. Для согласованной копии на время резервирования остановите приём записей (maintenance в proxy либо остановка web/backend), оставив PostgreSQL/MinIO работающими. Храните зашифрованную копию вне VPS, задайте срок хранения и регулярно проверяйте восстановление. Скрипт не создаёт расписание автоматически.

Перед обновлением сделайте копию, получите проверенный release из `main`, выполните preflight, затем `build` и `up -d --wait`. Не используйте `down -v`: это удаляет данные. Проверьте совместимость миграций перед возвратом к старому образу; откат приложения не отменяет миграции автоматически.

Восстановление выполняйте на отдельном экземпляре: остановите запись, восстановите БД через `pg_restore` в пустую базу и содержимое архива MinIO в пустой volume, сохранив владельца файлов; запускайте ту же версию приложения, что создала копию. Сначала проверьте документы, пользователей и доступность медиа на этом экземпляре. Не восстанавливайте поверх рабочей БД без отдельного согласованного плана.

Подход сверён с [deployment checklist Django 5.2](https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/) и [руководством Docker Compose для production](https://docs.docker.com/compose/how-tos/production/). Конфигурация подготовлена для одного VPS; автоматическое промышленное развёртывание, домен и сертификат клиента без доступа к его серверу не выполнялись.
