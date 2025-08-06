🧪 Команда для запуску PostgreSQL у Docker:
docker run --name hotel-db \
 -e POSTGRES_PASSWORD=mysecretpassword \
 -e POSTGRES_USER=postgres \
 -e POSTGRES_DB=hotel \
 -p 5432:5432 \
 -d postgres

🔄 Перевірити, що контейнер запущений:
docker ps

Має з’явитися рядок на кшталт:
CONTAINER ID IMAGE ... NAMES
abc123456789 postgres ... hotel-db

Можеш використовувати pgAdmin або DBeaver, щоб бачити свою базу в графічному інтерфейсі.
🧰 ВАРІАНТ 1: DBeaver — найзручніший (рекомендую)
✅ Переваги:
Безкоштовний

Підтримує багато баз (PostgreSQL, SQLite, MySQL...)

Працює стабільно та швидко
⚙️ Кроки для підключення:
Відкрий DBeaver

Натисни "New Database Connection"

Обери PostgreSQL

Введи такі дані:
| Поле | Значення |
| -------- | ------------------ |
| Host | `localhost` |
| Port | `5432` |
| Database | `hotel` |
| Username | `postgres` |
| Password | `mysecretpassword` |

📷 Як виглядає:
Після підключення ти побачиш:

hotel базу

Дерева з таблицями, схемами, даними

Можна робити SELECT, INSERT, змінювати вручну, тощо

🔚 В результаті:
Метод Маршрут Опис
GET /api/guests Отримати всіх гостей
POST /api/guests Додати нового гостя
PUT /api/guests/:id Оновити гостя
DELETE /api/guests/:id Видалити гостя
