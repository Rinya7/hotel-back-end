Класи для TypeORM, які перетворюються на таблиці в базі (наприклад Guest).

1. Створимо сутність Guest (це буде клас, який TypeORM конвертує у таблицю) файл Guest.ts

2. 📦 Сутність Admin (Admin.ts)

-Ендпоінт POST /auth/login
-Генерація та повернення JWT
-Middleware authMiddleware для перевірки токена
-Захист POST, PUT, DELETE /guests
