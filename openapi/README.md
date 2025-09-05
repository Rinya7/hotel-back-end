http://localhost:3000/docs

1. Архітектура OpenAPI

openapi/openapi.src.yaml — це твій головний файл, де зібрані всі components (схеми, типи) і таблиця paths, яка через $ref посилається на модулі.

openapi/paths/\*.yaml — окремі модулі для Auth, Rooms, Stays, Availability тощо.
У кожному модулі — набір PathItem під ключем (наприклад rooms_all).

swagger-cli bundle зливає все в один валідний файл openapi/openapi.yaml (зручно для CI, Swagger UI, валідаторів).

Так ми уникаємо гігантського моноліту й легко підтримуємо документацію.

Валідація через express-openapi-validator

2. Ми підключили middleware express-openapi-validator в app.ts.

Він бере openapi.yaml і автоматично:

перевіряє вхідні дані (body, query, path params) → відповідність схемам;

перевіряє вихідні відповіді контролера → чи дотримуються опису.

Результат: бекенд і фронт завжди синхронізовані зі схемою. Якщо бекенд повернув щось не по документації — отримаєш помилку.

3. Ролі та права

В Ролі та права адиминов.docx ти вже бачиш повну таблицю:

superadmin → створює/блокує адмінів, бачить усі кімнати.

admin → керує своїм готелем, кімнатами, редакторами.

editor → тільки працює зі статусами/гостями, без CRUD на користувачів чи кімнати.
Це вже відбито і в коді (middlewares) і в документації (security блоки в OpenAPI).

4. Endpoints

Ми підтягнули весь набір методів із твоїх файлів:

Auth (/auth/\*) → логін, створення admin/editor, users, block/unblock/delete.

Rooms (/rooms/\*) → CRUD, статус, список, всі кімнати.

Availability & Stats (/rooms/availability, /rooms/stats, /rooms/stays/current).

Stays (/rooms/number/{room}/stays, close, ручні check-in/out/cancel).

Stay Queries (/stays/status/{status}, arrivals, departures).

Кожен з них має:

приклади request/response;

опис ролей, хто має доступ;

помилки (400/401/403/404/409).

5. Frontend (Admin)

Ми вже заклали базовий Vue 3 фронт (login, dashboard, rooms, stays):

бере JWT з бекенда;

у Pinia зберігає token/role/username;

через Axios підставляє Authorization: Bearer …;

має захист роутів (beforeEach).
