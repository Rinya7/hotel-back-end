# Changelog

История изменений проекта Hotel Backend API.

## [2025-12-03]

### Added
- **Docker поддержка**: Добавлена полная Docker конфигурация для backend
  - `Dockerfile` с multi-stage build для оптимизации размера образа
  - `.dockerignore` для исключения ненужных файлов из контекста сборки
  - `docker-compose.yml` для удобного запуска backend + PostgreSQL
  - `DOCKER.md` - полная документация по развертыванию с Docker
  - Добавлен `/health` endpoint для healthcheck контейнера
  - Настроен непривилегированный пользователь для безопасности

## [2025-12-03]

### Fixed
- **OpenAPI документация**: Обновлен URL production сервера в `openapi/openapi.base.yaml`
  - Заменен устаревший внутренний адрес `http://46.224.81.114:3000` на публичный `https://hotel-lotse.app`
  - Добавлено пояснение про Nginx reverse proxy
  - Теперь документация отражает реальную конфигурацию production окружения

### Configuration
- **guest.controller.ts**: Исправлены fallback URL для `GUEST_APP_BASE_URL`
  - Заменен неправильный fallback для production с `http://46.224.81.114:3000` на `https://guest.hotel-lotse.app`
  - Теперь в обоих местах используется правильный адрес guest-app для production окружения

## [2025-12-03] (раньше)

### Fixed
- **guest.controller.ts**: Исправлены fallback URL для `GUEST_APP_BASE_URL` в методах `createGuestAccessLink()` и `sendGuestAccessLinkEmail()`
  - Заменен неправильный fallback для production с `http://46.224.81.114:3000` (адрес бэкенда) на `https://guest.hotel-lotse.app`
  - Заменен неправильный fallback для production с `https://hotel-lotse.app` (адрес админки) на `https://guest.hotel-lotse.app`
  - Теперь в обоих местах используется правильный адрес guest-app для production окружения

### Documentation
- Добавлены комментарии о логике изменения статуса комнаты при создании stay в `stayController.ts`
- Обновлена документация по переменным окружения (`ENV_CONFIGURATION.md`, `ENV_MIGRATION_SUMMARY.md`)
- Обновлена документация по миграциям (`MIGRATION_CLEANUP.md`, `README.md`)

## [Ранее]

### Features
- Добавлен домен `guest.hotel-lotse.app` в CORS `allowedOrigins` в `app.ts`
- Добавлена проверка конфликтов при изменении дат stays
- Добавлены поля дат в API stays
- Улучшена обработка ошибок в `stayOps` контроллере

### Fixes
- Исправлено сравнение дат для today arrivals/departures
- Исправлено отображение arrivals today (показывает только booked stays)
- Убрано автоматическое изменение статусов комнат в `getRooms`
- Добавлен skip для localhost в rate limit

---

*Примечание: Для полной истории изменений смотрите git log: `git log --oneline`*

