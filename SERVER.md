🧠 ПІДКЛЮЧЕННЯ ДО БД (DBeaver)
ssh -L 5432:localhost:5432 root@46.224.81.114


У DBeaver:

Host: localhost
Port: 5432
Database: hotel_lotse
User: hotel
Password: 067D446v99A39!


🔥 Тож правильний процес оновлення backend:
👉 локально пушиш
git add .
git commit -m "session fix"
git push

👉 тоді на сервері НЕ треба npm — треба зайти в Docker!
🟣 ПРАВИЛЬНИЙ ПРОЦЕС ОНОВЛЕННЯ BACKEND
cd /opt/hotel-lotse/backend
git pull

cd /opt/hotel-lotse
docker compose up -d --build backend
docker compose restart backend


Подробнее:
1) Увійти на сервер
ssh root@46.224.81.114

2) Перейти в папку проєкту
cd /opt/hotel-lotse

3) Оновити код з GitHub

(обов’язково перед будь-яким перезапуском!)

cd backend
git pull
cd ..

🚀 4) ПЕРЕЗІБРАТИ BACKEND-КОНТЕЙНЕР

(цей крок найважливіший після змін у коді)

docker compose up -d --build backend


✔ перебудує контейнер
✔ оновить npm install
✔ згенерує dist
✔ підніме backend з новим кодом
✔ db не рухає

5) Перезапустити тільки backend (швидкий варіант)

Якщо не потрібно rebuild, а тільки restart:

docker compose restart backend

6) Подивитися логі backend у реальному часі
docker logs -f hotel_backend


Вийти → Ctrl + C

7) Увійти всередину контейнера backend
docker exec -it hotel_backend bash


Ти у /app — це твій backend-код.

8) Запустити міграції вручну (якщо потрібно)

(коли зміни у схемі БД)

npm run db:migrate

9) Сидинг супер-адміна
npm run seed:superadmin

10) Якщо контейнер не стартує — перевірити помилки
docker ps -a
docker logs hotel_backend

11) Повне очищення і rebuilding (рідко)
docker compose down
docker compose build --no-cache
docker compose up -d

12) Перевірити, що backend живий
curl http://127.0.0.1:3000


Очікуєш:

Hotel backend is running!

13) Перевірити, що контейнер активний
docker ps | grep backend

14) Перезапуск PostgreSQL (лише якщо треба)
docker compose restart db