Обробники запитів. Тут логіка що відповідає на запити типу GET /rooms.

🧩 Повний список можливостей для Admin (roomController.ts)

✅ Тепер готові роути:
Метод URL Що робить Хто має доступ
GET /rooms Повертає всі кімнати адміна admin
POST /rooms Створює нову кімнату admin
PUT /rooms/:id Редагує всю кімнату admin
PUT /rooms/:id/status Змінює статус admin, editor
DELETE /rooms/:id Видаляє кімнату admin
