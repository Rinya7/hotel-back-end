# Запуск проекту з нуля

## 🚀 Швидкий старт

### 1. Встановлення залежностей
```bash
npm install
```

### 2. Налаштування бази даних

#### Варіант A: Docker (рекомендовано)
```bash
# Запустити PostgreSQL в Docker
docker run --name hotel-db \
  -e POSTGRES_PASSWORD=mysecretpassword \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=hotel \
  -p 5432:5432 \
  -d postgres

# Перевірити, що контейнер запущений
docker ps
```

#### Варіант B: Локальний PostgreSQL
Встановити PostgreSQL локально і створити базу `hotel`.

### 3. Налаштування змінних середовища

Створити файл `.env` в корені проекту:

```env
# База даних
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=mysecretpassword
DB_NAME=hotel

# JWT
JWT_SECRET=your-super-secret-key-here

# Супер-адмін
SUPERADMIN_USERNAME=superadmin
SUPERADMIN_PASSWORD=your-superadmin-password
```

### 4. Перший запуск (тільки один раз)

```bash
# Застосувати міграції (створити таблиці)
npm run db:migrate

# Створити супер-адміна
npm run seed:superadmin
```

### 5. Запуск сервера

```bash
# Режим розробки (автоматичне перезавантаження)
npm run dev

# Або звичайний запуск
npm start
```

Сервер буде доступний на http://localhost:3000

### 6. Перевірка роботи

1. **Swagger UI:** http://localhost:3000/docs
2. **Логін супер-адміна:**
   ```bash
   curl -X POST http://localhost:3000/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username": "superadmin", "password": "your-superadmin-password"}'
   ```

## 📋 Команди розробки

### База даних
```bash
# Застосувати міграції
npm run db:migrate

# Відкотити останню міграцію
npm run db:revert

# Згенерувати нову міграцію (коли змінили entities)
npm run db:gen:init

# Створити супер-адміна
npm run seed:superadmin
```

### OpenAPI
```bash
# Зібрати документацію
npm run openapi:bundle

# Перевірити валідність
npm run openapi:lint
```

## 🔄 Сценарії використання

### Сценарій 1: Новий проект (перший раз)
1. `npm install`
2. Налаштувати `.env`
3. Запустити PostgreSQL
4. `npm run db:migrate`
5. `npm run seed:superadmin`
6. `npm run dev`

### Сценарій 2: Після зміни entities
1. `npm run db:gen:init` (генерує міграцію)
2. `npm run db:migrate` (застосовує міграцію)
3. `npm run dev`

### Сценарій 3: Після видалення БД
1. Запустити PostgreSQL
2. `npm run db:migrate`
3. `npm run seed:superadmin`
4. `npm run dev`

### Сценарій 4: Повний ресет
1. `npm run db:revert` (відкотити міграції)
2. `npm run db:migrate` (застосувати знову)
3. `npm run seed:superadmin`
4. `npm run dev`

## 🐛 Часті проблеми

### "password authentication failed"
- Перевірте `.env` файл
- Переконайтеся, що PostgreSQL запущений
- Перевірте пароль в Docker команді

### "relation does not exist"
- Не застосовані міграції: `npm run db:migrate`
- Або повний ресет: `npm run db:revert && npm run db:migrate`

### "No migrations are pending"
- Спочатку згенеруйте міграцію: `npm run db:gen:init`
- Потім застосуйте: `npm run db:migrate`

### Порт 5432 зайнятий
- Зупиніть інший PostgreSQL: `docker stop hotel-db`
- Або змініть порт в Docker команді: `-p 5433:5432`

### Порт 3000 зайнятий
- Зупиніть інший сервер
- Або змініть порт в `.env`: `PORT=3001`

## 🔧 Налаштування для розробки

### DBeaver (рекомендовано)
1. Відкрити DBeaver
2. New Database Connection → PostgreSQL
3. Налаштування:
   - Host: `localhost`
   - Port: `5432`
   - Database: `hotel`
   - Username: `postgres`
   - Password: `mysecretpassword`

### VS Code
Рекомендовані розширення:
- TypeScript Importer
- REST Client
- PostgreSQL

### Postman
Імпортувати OpenAPI схему:
1. Відкрити Postman
2. Import → Link
3. Ввести: `http://localhost:3000/docs.json`

## 📖 Документація

- **Swagger UI:** http://localhost:3000/docs
- **API JSON:** http://localhost:3000/docs.json
- **OpenAPI схема:** `openapi/openapi.yaml`

## 🚀 Production

1. Встановити змінні середовища
2. `npm run db:migrate`
3. `npm run seed:superadmin`
4. `npm start`

## 📞 Підтримка

При проблемах:
1. Перевірте логи сервера
2. Перевірте підключення до БД
3. Переконайтеся, що всі міграції застосовані
4. Перевірте `.env` файл