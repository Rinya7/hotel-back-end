Тут реєструються всі URL маршрути. Вони викликають контролери.
Маршруты (итоговая карта)
Для комнат:

GET /rooms/all — супер-админ

GET /rooms — комнаты текущего отеля

POST /rooms — создать комнату (только admin)

PUT /rooms/number/:roomNumber — правка комнаты

PUT /rooms/number/:roomNumber/status — вручную статус комнаты

DELETE /rooms/number/:roomNumber — удалить комнату (admin)

GET /rooms/number/:roomNumber/availability — доступность

GET /rooms/availability — доступность по всем

GET /rooms/stats — статистика free/booked/occupied

GET /rooms/status/:status — список комнат по статусу (для кнопки Free, и т.д.)

Проживания по конкретному номеру:

POST /rooms/number/:roomNumber/stays — создать бронь/заселение

GET /rooms/number/:roomNumber/stays — история по номеру

PUT /rooms/number/:roomNumber/stays — правка (по датам)

PUT /rooms/number/:roomNumber/stays/close — закрыть/отменить

Общие списки и ручные действия:

GET /stays/current — активные по всему отелю

GET /stays/status/:status — Booked/Occupied/… списки

GET /stays/today/arrivals — сегодня заезды

GET /stays/today/departures — сегодня выезды

POST /stays/:id/check-in — заселить вручную

POST /stays/:id/check-out — выселить вручную

POST /stays/:id/cancel — отменить бронь
