# Config (Конфігурація)

## Призначення папки

Папка містить файли конфігурації для різних частин системи: база даних, OpenAPI валідація, Swagger документація, часові зони.

## Структура

```
src/config/
├── data-source.ts         # TypeORM конфігурація БД
├── openapi-validator.ts   # Валідація OpenAPI запитів/відповідей
├── swagger.ts             # Swagger UI налаштування
└── time.ts                # Конфігурація часових зон
```

## Файли

### data-source.ts

**Призначення:** Конфігурація підключення до PostgreSQL через TypeORM.

**Що робить:**

- Створює DataSource для TypeORM
- Налаштовує підключення до БД з .env змінних
- Вказує шляхи до entities та migrations
- Налаштовує пул з'єднань
- Налаштовує SSL для production

**Основні налаштування:**

- Тип БД: PostgreSQL
- Entities: автоматичне завантаження з `src/entities/**/*.{ts,js}`
- Migrations: з `src/migrations/*.{ts,js}`
- Логування: тільки в dev режимі
- Synchronize: false (використовуємо міграції)

**Експортує:**

- `AppDataSource` - екземпляр DataSource для використання в додатку

**Використання:**

```typescript
import { AppDataSource } from "./config/data-source";

await AppDataSource.initialize();
```

### openapi-validator.ts

**Призначення:** Налаштування валідації HTTP запитів та відповідей згідно OpenAPI специфікації.

**Що робить:**

- Читає OpenAPI схему з `openapi/openapi.yaml`
- Валідує всі HTTP запити та відповіді
- Ігнорує певні шляхи (наприклад, /docs)
- Повертає помилки валідації клієнту

**Основні функції:**

- `setupOpenApiValidator(app: Express)` - налаштовує валідатор для Express додатку

**Використання:**

```typescript
import { setupOpenApiValidator } from "./config/openapi-validator";

setupOpenApiValidator(app);
```

### swagger.ts

**Призначення:** Налаштування Swagger UI для інтерактивної документації API.

**Що робить:**

- Налаштовує Swagger UI на `/docs`
- Надає JSON схему на `/docs.json`
- Читає OpenAPI специфікацію
- Додає UI для тестування API

**Основні функції:**

- `setupSwagger(app: Express)` - налаштовує Swagger UI

**Використання:**

```typescript
import { setupSwagger } from "./config/swagger";

const openapiDoc = setupSwagger(app);
```

**Доступ:**

- Swagger UI: `http://localhost:3000/docs`
- JSON схема: `http://localhost:3000/docs.json`

### time.ts

**Призначення:** Конфігурація часових зон для роботи з датами.

**Що робить:**

- Визначає часову зону додатку (за замовчуванням Europe/Rome)
- Експортує константу `APP_TIMEZONE` для використання в сервісах

**Основні налаштування:**

- `APP_TIMEZONE` - часова зона для всіх операцій з датами

**Використання:**

```typescript
import { APP_TIMEZONE } from "./config/time";

// Використання в сервісах для роботи з датами
```

## Важливі моменти

- **Змінні середовища** - всі конфігурації читаються з .env файлу
- **Production налаштування** - SSL, пул з'єднань налаштовуються для production
- **Валідація** - OpenAPI валідатор перевіряє всі запити автоматично
- **Документація** - Swagger UI завжди синхронізований з OpenAPI схемою

---

**Останнє оновлення:** 2025-01-XX




