# OpenAPI Documentation

**Документація:** http://localhost:3000/docs

## 1. Архітектура OpenAPI

- **Головний файл:** `openapi/openapi.base.yaml` (всі components + paths із `$ref` на модулі)
- **Модулі:** `openapi/paths/*.yaml` з `PathItem` під ключами (наприклад, `rooms_all`)
- **Збірка:** `swagger-cli bundle` → `openapi/openapi.yaml` (використовується у Swagger UI/CI)

### Команди

- Зібрати OpenAPI: `npm run openapi:bundle`
- Провалідувати: `npm run openapi:lint`

## 2. Валідація через express-openapi-validator

У `src/app.ts` підключено middleware, яке читає `openapi/openapi.yaml` і:
- перевіряє вхідні дані (body, query, path params)
- перевіряє вихідні відповіді контролерів

### Swagger UI та JSON

- **UI:** `GET /docs`
- **JSON:** `GET /docs.json`

## 3. Теги/Домени

- **Auth** — логін та керування користувачами
- **Rooms** — CRUD кімнат і статуси
- **Policy Hours** — масові години заселення/виїзду
- **Availability & Stats** — доступність, статистика, активні проживання
- **Stays** — CRUD проживань під кімнатами
- **Stay Ops** — ручні check-in/out/cancel
- **Stay Queries** — добірки для дашборда

## 4. Ролі та права

- **superadmin** → створює/блокує адмінів, бачить усі кімнати
- **admin** → керує своїм готелем, кімнатами, редакторами
- **editor** → тільки працює зі статусами/гостями, без CRUD на користувачів чи кімнати

Це відбито в коді (middlewares) і в документації (security блоки в OpenAPI).