# Routes (Маршрути API)

## Що це?
Routes — це визначення URL endpoints та їх обробників. Вони з'єднують HTTP запити з контролерами.

## Структура
```
src/routes/
├── auth.routes.ts           # Аутентифікація
├── roomRoutes.ts           # Кімнати
├── roomStay.ts             # Проживання по кімнатах
├── stayRoutes.ts           # Операції з проживаннями
├── roomPolicy.routes.ts    # Політики кімнат
├── guest.routes.ts         # Гостьовий доступ
├── audit.routes.ts         # Аудит логів
└── INFO_*.md              # Документація
```

## Основні маршрути

### auth.routes.ts
```typescript
router.post('/login', login);                    // Логін
router.post('/create-admin', authMiddleware, createAdmin);
router.post('/create-editor', authMiddleware, createEditor);
router.get('/users', authMiddleware, getUsers);
router.put('/block/:username', authMiddleware, blockUser);
router.put('/unblock/:username', authMiddleware, unblockUser);
router.delete('/delete/:username', authMiddleware, deleteUser);
```

### roomRoutes.ts
```typescript
router.get('/all', authMiddleware, getAllRooms);           // Всі кімнати (superadmin)
router.get('/', authMiddleware, getRooms);                // Кімнати готелю
router.post('/', authMiddleware, createRoom);             // Створити кімнату
router.put('/number/:roomNumber', authMiddleware, updateRoom);
router.delete('/number/:roomNumber', authMiddleware, deleteRoom);
router.put('/number/:roomNumber/status', authMiddleware, updateRoomStatus);
```

### roomStay.ts
```typescript
router.get('/number/:roomNumber/stays', authMiddleware, getStaysByRoom);
router.post('/number/:roomNumber/stays', authMiddleware, createStay);
router.put('/number/:roomNumber/stays/close', authMiddleware, closeStay);
```

### stayRoutes.ts
```typescript
router.post('/:id/check-in', authMiddleware, checkIn);
router.post('/:id/check-out', authMiddleware, checkOut);
router.post('/:id/cancel', authMiddleware, cancelStay);
```

### guest.routes.ts
```typescript
router.post('/stays/:stayId/link', authenticateToken, isEditorOrAdmin, createGuestAccessLink);
router.get('/access/:token', getGuestAccessByToken); // Публічний ендпоінт
```

## Повна карта endpoints

### Аутентифікація (`/auth`)
| Метод | URL | Опис | Доступ |
|-------|-----|------|--------|
| POST | `/auth/login` | Логін | Публічний |
| POST | `/auth/create-admin` | Створити адміна | superadmin |
| POST | `/auth/create-editor` | Створити редактора | admin |
| GET | `/auth/users` | Список користувачів | superadmin, admin |
| PUT | `/auth/block/:username` | Заблокувати | superadmin |
| PUT | `/auth/unblock/:username` | Розблокувати | superadmin |
| DELETE | `/auth/delete/:username` | Видалити | superadmin, admin |

### Кімнати (`/rooms`)
| Метод | URL | Опис | Доступ |
|-------|-----|------|--------|
| GET | `/rooms/all` | Всі кімнати | superadmin |
| GET | `/rooms` | Кімнати готелю | admin, editor |
| POST | `/rooms` | Створити кімнату | admin |
| PUT | `/rooms/number/:roomNumber` | Редагувати | admin |
| DELETE | `/rooms/number/:roomNumber` | Видалити | admin |
| PUT | `/rooms/number/:roomNumber/status` | Змінити статус | admin, editor |
| GET | `/rooms/status/:status` | Кімнати за статусом | admin, editor |
| GET | `/rooms/availability` | Доступність | admin, editor |
| GET | `/rooms/stats` | Статистика | admin, editor |

### Проживання (`/rooms/number/:roomNumber/stays`)
| Метод | URL | Опис | Доступ |
|-------|-----|------|--------|
| GET | `/rooms/number/:roomNumber/stays` | Історія кімнати | admin, editor |
| POST | `/rooms/number/:roomNumber/stays` | Створити бронювання | admin, editor |
| PUT | `/rooms/number/:roomNumber/stays/close` | Закрити | admin, editor |

### Операції з проживаннями (`/stays`)
| Метод | URL | Опис | Доступ |
|-------|-----|------|--------|
| POST | `/stays/:id/check-in` | Заселити | admin, editor |
| POST | `/stays/:id/check-out` | Виселити | admin, editor |
| POST | `/stays/:id/cancel` | Скасувати | admin, editor |
| GET | `/stays/status/:status` | За статусом | admin, editor |
| GET | `/stays/today/arrivals` | Сьогоднішні заїзди | admin, editor |
| GET | `/stays/today/departures` | Сьогоднішні виїзди | admin, editor |

### Гостьовий доступ (`/guest`)
| Метод | URL | Опис | Доступ |
|-------|-----|------|--------|
| POST | `/guest/stays/:stayId/link` | Створити/отримати токен доступу | admin, editor |
| GET | `/guest/access/:token` | Отримати дані проживання по токену | Публічний (по токену) |

## Підключення в app.ts
```typescript
// src/app.ts
app.use('/auth', authRoutes);
app.use('/rooms', roomRoutes);
app.use('/rooms', roomStay);
app.use('/stays', stayRoutes);
app.use('/audit', auditRoutes);
app.use('/guest', guestRoutes);
app.use(roomPolicyRoutes);
```

## Параметри маршрутів

### Path параметри
```typescript
// :roomNumber, :id, :username
router.get('/number/:roomNumber', (req, res) => {
  const roomNumber = req.params.roomNumber;
});
```

### Query параметри
```typescript
// ?from=2025-01-01&to=2025-01-31
router.get('/availability', (req, res) => {
  const from = req.query.from;
  const to = req.query.to;
});
```

### Body дані
```typescript
// POST /rooms
router.post('/', (req, res) => {
  const roomData = req.body; // { roomNumber, floor, capacity, ... }
});
```

## Валідація
Всі маршрути автоматично валідуються через OpenAPI валідатор:
- **Path параметри** — перевіряються на тип та формат
- **Query параметри** — перевіряються на наявність та тип
- **Body дані** — перевіряються на відповідність схемі
- **Відповіді** — перевіряються на відповідність документації

## Обробка помилок
```typescript
// Автоматичні коди помилок
400 — Bad Request (невалідні дані)
401 — Unauthorized (немає токену)
403 — Forbidden (немає прав)
404 — Not Found (ресурс не знайдено)
409 — Conflict (дублікат)
500 — Internal Server Error
```

## Приклад створення нового маршруту
```typescript
// 1. Додати в контролер
export const newEndpoint = async (req: Request, res: Response) => {
  // Логіка
};

// 2. Додати в routes
router.get('/new-endpoint', authMiddleware, newEndpoint);

// 3. Додати в OpenAPI документацію
// openapi/paths/new-module.yaml
```

## Важливі моменти
- **Порядок** — більш специфічні маршрути мають бути вище
- **Middleware** — завжди додавати authMiddleware для захищених endpoints
- **Валідація** — OpenAPI автоматично валідує всі дані
- **Документація** — кожен endpoint має бути описаний в OpenAPI