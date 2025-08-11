Порядок запуску з нуля
npm run db:gen (перший раз, щоб з’явилась міграція з новими колонками/enum/FK)

npm run db:setup (прогнати міграції + створити/оновити супер-адміна)

стартуй бекенд, логінься:

POST /auth/login → { "username": "superadmin", "password": "<SUPERADMIN_PASSWORD>" }

Після цього супер-адмін через /auth/create-admin створює готелі (admin), а ті — своїх editor’ів.
Якщо щось впирається у схему (типу “колонка не існує”) — значить не пройшли міграції; db:migrate виправить.

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

далее создаем таблици и superadmin:
"db:gen:init": "typeorm-ts-node-commonjs migration:generate src/migrations/init_schema -d src/config/data-source.ts",
"db:migrate": "typeorm-ts-node-commonjs migration:run -d src/config/data-source.ts",
"seed:superadmin": "ts-node src/seeds/seedSuperadmin.ts"

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

Програма ChatGPT сказала:
🔑 Це дуже правильне стратегічне рішення — створити рівень superadmin, який:

👑 Що може superadmin:
Можливість Опис
Створювати admin Наприклад, для кожного готелю
Блокувати / розблоковувати admin У разі несплати, порушень тощо
Переглядати всіх admin і їх editor Повний контроль
❌ НЕ створює editor напряму Це робить сам admin для свого готелю

1. Каждый раз, когда ты удалил БД и хочешь поднять проект заново
   (при условии, что миграции уже есть в репо)

Запусти Postgres (например, Docker-командой, как у тебя).

Убедись, что .env совпадает с POSTGRES_USER/PASSWORD/DB.

Прогоняешь миграции → создаются таблицы:
npm run db:migrate
Сидишь супер-админа:
npm run seed:superadmin
Стартуешь бэкенд и логинишься супер-админом:
POST /auth/login
{ "username": "superadmin", "password": "<SUPERADMIN_PASSWORD из .env>" }
Дальше superadmin делает /auth/create-admin, а админы — своих editor’ов. Всё.

На будущее можешь завести алиас:
"db:setup": "npm run db:migrate && npm run seed:superadmin" — чтобы запускать одной командой.

2. Если миграций ещё нет (или ты менял сущности и хочешь добавить новую миграцию)
   (делается не каждый раз, а только когда изменилась схема)

Сгенерить миграцию (создаст файл в src/migrations/):
npm run db:gen:init
Применить её:
npm run db:migrate
Засеять супер-админа:
npm run seed:superadmin
Закоммить файл миграции в репозиторий. В следующий раз достаточно сценария из секции №1.
