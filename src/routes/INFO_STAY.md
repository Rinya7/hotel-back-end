# Stay Routes (Маршрути проживань)

## Що це?
Маршрути для управління проживаннями гостей. Включає створення, редагування, закриття та операції з проживаннями.

## Файли
- `src/routes/roomStay.ts` — проживання по кімнатах
- `src/routes/stayRoutes.ts` — операції з проживаннями

## Endpoints

### GET /rooms/number/:roomNumber/stays
**Призначення:** Історія проживань по кімнаті

**Headers:** `Authorization: Bearer <token>`

**Query параметри:**
- `from` (опціонально) — дата початку фільтру (YYYY-MM-DD)
- `to` (опціонально) — дата кінця фільтру (YYYY-MM-DD)

**Відповідь:**
```json
[
  {
    "id": 1,
    "room": {
      "id": 1,
      "roomNumber": "101",
      "status": "occupied"
    },
    "mainGuestName": "John Doe",
    "extraGuestNames": ["Jane Doe"],
    "checkIn": "2025-01-01",
    "checkOut": "2025-01-05",
    "balance": 500.00,
    "status": "occupied"
  }
]
```

**Помилки:**
- `404` — кімната не знайдена

### POST /rooms/number/:roomNumber/stays
**Призначення:** Створити бронювання/заселення

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "mainGuestName": "John Doe",
  "extraGuestNames": ["Jane Doe", "Bob Smith"],
  "checkIn": "2025-01-01",
  "checkOut": "2025-01-05",
  "balance": 500.00,
  "status": "booked"
}
```

**Відповідь:**
```json
{
  "message": "Stay created successfully",
  "stay": {
    "id": 1,
    "room": { "id": 1, "roomNumber": "101", "status": "booked" },
    "mainGuestName": "John Doe",
    "extraGuestNames": ["Jane Doe", "Bob Smith"],
    "checkIn": "2025-01-01",
    "checkOut": "2025-01-05",
    "balance": 500.00,
    "status": "booked"
  }
}
```

**Помилки:**
- `400` — невалідні дані
- `404` — кімната не знайдена
- `409` — конфлікт дат (кімната зайнята)

### PUT /rooms/number/:roomNumber/stays/close
**Призначення:** Закрити проживання

**Headers:** `Authorization: Bearer <token>`

**Query параметри:**
- `checkIn` — дата заїзду (YYYY-MM-DD)
- `checkOut` — дата виїзду (YYYY-MM-DD)

**Body:**
```json
{
  "status": "completed"
}
```

**Відповідь:**
```json
{
  "message": "Stay closed successfully"
}
```

**Помилки:**
- `400` — невалідні дані
- `404` — проживання не знайдено

### POST /stays/:id/check-in
**Призначення:** Заселити гостя (booked → occupied)

**Headers:** `Authorization: Bearer <token>`

**Body (опціонально):**
```json
{
  "force": true
}
```

**Відповідь:**
```json
{
  "message": "Check-in successful",
  "stay": {
    "id": 1,
    "status": "occupied",
    "room": { "status": "occupied" }
  }
}
```

**Помилки:**
- `400` — не можна заселити (кімната зайнята)
- `404` — проживання не знайдено

### POST /stays/:id/check-out
**Призначення:** Виселити гостя (occupied → completed)

**Headers:** `Authorization: Bearer <token>`

**Body (опціонально):**
```json
{
  "force": true
}
```

**Відповідь:**
```json
{
  "message": "Check-out successful",
  "stay": {
    "id": 1,
    "status": "completed",
    "room": { "status": "free" }
  }
}
```

**Помилки:**
- `400` — не можна виселити
- `404` — проживання не знайдено

### POST /stays/:id/cancel
**Призначення:** Скасувати бронювання (booked → cancelled)

**Headers:** `Authorization: Bearer <token>`

**Відповідь:**
```json
{
  "message": "Stay cancelled successfully",
  "stay": {
    "id": 1,
    "status": "cancelled",
    "room": { "status": "free" }
  }
}
```

**Помилки:**
- `400` — не можна скасувати
- `404` — проживання не знайдено

## Статуси проживань

### booked
- Бронювання створено
- Кімната має статус "booked"
- Гість ще не заселився

### occupied
- Гість заселився
- Кімната має статус "occupied"
- Можна виселити або скасувати

### completed
- Проживання завершено
- Кімната звільнена (статус "free")
- Фінальний статус

### cancelled
- Бронювання скасовано
- Кімната звільнена (статус "free")
- Фінальний статус

## Ролі та права

### Admin
- ✅ Створює проживання
- ✅ Редагує проживання
- ✅ Закриває проживання
- ✅ Ручні check-in/out/cancel
- ✅ Бачить всі проживання свого готелю

### Editor
- ✅ Створює проживання
- ✅ Редагує проживання
- ✅ Закриває проживання
- ✅ Ручні check-in/out/cancel
- ✅ Бачить проживання кімнат свого готелю

### Superadmin
- ✅ Всі права admin
- ✅ Бачить проживання всіх готелів

## Бізнес-логіка

### Створення проживання
1. Перевірка доступності кімнати
2. Валідація дат (checkIn < checkOut)
3. Створення запису
4. Оновлення статусу кімнати

### Check-in
1. Перевірка статусу "booked"
2. Перевірка доступності кімнати
3. Оновлення статусу на "occupied"
4. Оновлення статусу кімнати

### Check-out
1. Перевірка статусу "occupied"
2. Оновлення статусу на "completed"
3. Звільнення кімнати (статус "free")

### Скасування
1. Перевірка статусу "booked"
2. Оновлення статусу на "cancelled"
3. Звільнення кімнати (статус "free")

## Приклад використання

### 1. Створити бронювання
```bash
curl -X POST http://localhost:3000/rooms/number/101/stays \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "mainGuestName": "John Doe",
    "checkIn": "2025-01-01",
    "checkOut": "2025-01-05",
    "status": "booked"
  }'
```

### 2. Заселити гостя
```bash
curl -X POST http://localhost:3000/stays/1/check-in \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

### 3. Виселити гостя
```bash
curl -X POST http://localhost:3000/stays/1/check-out \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

### 4. Скасувати бронювання
```bash
curl -X POST http://localhost:3000/stays/1/cancel \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

## Часті помилки

### "Room is not available"
- Кімната зайнята в ці дати
- Перевірте доступність

### "Invalid dates"
- checkIn >= checkOut
- Перевірте правильність дат

### "Stay not found"
- Проживання не існує
- Перевірте ID

### "Cannot check-in"
- Кімната зайнята
- Використайте `force: true` для примусового заселення