# Auth Routes (Маршрути аутентифікації)

## Що це?
Маршрути для аутентифікації та управління користувачами. Включає логін, створення користувачів, блокування тощо.

## Файл
`src/routes/auth.routes.ts`

## Endpoints

### POST /auth/login
**Призначення:** Аутентифікація користувача

**Body:**
```json
{
  "username": "superadmin",
  "password": "your-password"
}
```

**Відповідь:**
```json
{
  "payload": {
    "token": "jwt-token-here",
    "username": "superadmin",
    "role": "superadmin",
    "adminId": 1,
    "hotelName": "Hotel Name",
    "policy": {
      "checkInHour": 15,
      "checkOutHour": 11
    }
  }
}
```

**Помилки:**
- `401` — невірні облікові дані
- `403` — користувач заблокований

### POST /auth/create-admin
**Призначення:** Створення нового адміна (тільки superadmin)

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "username": "hotel-admin",
  "password": "secure-password",
  "confirmPassword": "secure-password",
  "hotel_name": "Hotel Aurora",
  "address": "Kyiv, Ukraine",
  "full_name": "John Doe",
  "phone": "+380123456789",
  "email": "admin@hotel.com",
  "checkInHour": 15,
  "checkOutHour": 11,
  "defaultWifiName": "hotel_wifi",
  "defaultWifiPassword": "admin123"
}
```

**Відповідь:**
```json
{
  "message": "Admin created successfully",
  "adminId": 2,
  "policy": {
    "checkInHour": 15,
    "checkOutHour": 11
  }
}
```

**Помилки:**
- `400` — невалідні дані або дублікат username
- `403` — немає прав (не superadmin)

### POST /auth/create-editor
**Призначення:** Створення редактора (тільки admin)

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "username": "hotel-editor",
  "password": "secure-password",
  "confirmPassword": "secure-password",
  "full_name": "Jane Doe",
  "phone": "+380987654321",
  "email": "editor@hotel.com"
}
```

**Відповідь:**
```json
{
  "message": "Editor created successfully",
  "token": "jwt-token-for-editor"
}
```

**Помилки:**
- `400` — невалідні дані або дублікат username
- `403` — немає прав (не admin)

### GET /auth/users
**Призначення:** Список користувачів

**Headers:** `Authorization: Bearer <token>`

**Відповідь:**
```json
{
  "id": 1,
  "username": "superadmin",
  "role": "superadmin",
  "hotel_name": null,
  "address": null,
  "full_name": null,
  "logo_url": null,
  "phone": null,
  "email": null,
  "isBlocked": false,
  "checkInHour": null,
  "checkOutHour": null,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z",
  "editorsCount": 0,
  "editors": []
}
```

**Помилки:**
- `403` — немає прав

### PUT /auth/block/:username
**Призначення:** Заблокувати користувача (superadmin)

**Headers:** `Authorization: Bearer <token>`

**Відповідь:**
```json
{
  "message": "User blocked successfully"
}
```

**Помилки:**
- `403` — немає прав (не superadmin)
- `404` — користувач не знайдено

### PUT /auth/unblock/:username
**Призначення:** Розблокувати користувача (superadmin)

**Headers:** `Authorization: Bearer <token>`

**Відповідь:**
```json
{
  "message": "User unblocked successfully"
}
```

**Помилки:**
- `403` — немає прав (не superadmin)
- `404` — користувач не знайдено

### DELETE /auth/delete/:username
**Призначення:** Видалити користувача

**Headers:** `Authorization: Bearer <token>`

**Права:**
- **superadmin** — може видалити будь-кого
- **admin** — може видалити тільки своїх editor'ів

**Відповідь:**
```json
{
  "message": "User deleted successfully"
}
```

**Помилки:**
- `403` — немає прав
- `404` — користувач не знайдено

## Ролі та права

### Superadmin
- ✅ Створює admin'ів
- ✅ Бачить всіх користувачів
- ✅ Блокує/розблоковує будь-кого
- ✅ Видаляє будь-кого
- ❌ НЕ створює editor'ів напряму

### Admin
- ✅ Створює editor'ів
- ✅ Бачить своїх editor'ів
- ✅ Видаляє тільки своїх editor'ів
- ❌ НЕ може створювати admin'ів
- ❌ НЕ може блокувати/розблоковувати

### Editor
- ❌ НЕ має доступу до auth endpoints
- ❌ НЕ може створювати користувачів
- ❌ НЕ може керувати користувачами

## Безпека

### JWT Токени
- **Тривалість:** 48 годин
- **Алгоритм:** HS256
- **Секрет:** змінна середовища `JWT_SECRET`

### Хешування паролів
- **Алгоритм:** bcrypt
- **Salt rounds:** 10

### Валідація
- **Username:** унікальний, обов'язковий
- **Password:** мінімум 6 символів
- **Email:** валідний формат (опціонально)
- **Phone:** валідний формат (опціонально)

## Приклад використання

### 1. Логін
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "superadmin", "password": "your-password"}'
```

### 2. Створення адміна
```bash
curl -X POST http://localhost:3000/auth/create-admin \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "hotel-admin",
    "password": "secure-password",
    "confirmPassword": "secure-password",
    "hotel_name": "Hotel Aurora",
    "address": "Kyiv, Ukraine"
  }'
```

### 3. Створення редактора
```bash
curl -X POST http://localhost:3000/auth/create-editor \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "hotel-editor",
    "password": "secure-password",
    "confirmPassword": "secure-password"
  }'
```

## Часті помилки

### "User already exists"
- Username вже зайнятий
- Використайте інший username

### "Invalid credentials"
- Невірний username або password
- Перевірте правильність введених даних

### "User is blocked"
- Користувач заблокований
- Зверніться до superadmin

### "Forbidden"
- Немає прав для виконання дії
- Перевірте роль користувача