# Controllers (Обробники запитів)

## Що це?
Контролери — це обробники HTTP запитів. Вони отримують запити від клієнта, викликають відповідні сервіси для обробки бізнес-логіки, і повертають відповіді.

## Структура
```
src/controllers/
├── auth.controller.ts           # Аутентифікація та користувачі
├── roomController.ts           # Управління кімнатами
├── roomAvailabilityController.ts # Доступність кімнат
├── roomPolicy.controller.ts    # Політики кімнат
├── stayController.ts           # Проживання
├── stayOps.controller.ts       # Операції з проживаннями
└── stayQuery.controller.ts     # Запити по проживаннях
```

## Основні контролери

### auth.controller.ts
- **login()** — аутентифікація користувача
- **createAdmin()** — створення адміна (тільки superadmin)
- **createEditor()** — створення редактора (тільки admin)
- **getUsers()** — список користувачів
- **blockUser()** / **unblockUser()** — блокування
- **deleteUser()** — видалення користувача

### roomController.ts
- **getAllRooms()** — всі кімнати (superadmin)
- **getRooms()** — кімнати поточного готелю
- **createRoom()** — створення кімнати
- **updateRoom()** — редагування кімнати
- **deleteRoom()** — видалення кімнати
- **updateRoomStatus()** — зміна статусу кімнати

### stayController.ts
- **getStaysByRoom()** — історія проживань кімнати
- **createStay()** — створення бронювання/заселення
- **closeStay()** — закриття проживання

## Як працює?
1. **Отримання запиту** — Express передає запит в контролер
2. **Валідація** — перевірка даних через OpenAPI валідатор
3. **Авторизація** — перевірка прав через authMiddleware
4. **Бізнес-логіка** — виклик відповідного сервісу
5. **Відповідь** — повернення результату клієнту

## Приклад
```typescript
// roomController.ts
export const createRoom = async (req: Request, res: Response) => {
  try {
    // 1. Отримуємо дані з запиту (вже валідовані)
    const roomData = req.body;
    
    // 2. Викликаємо сервіс
    const room = await roomService.createRoom(roomData, req.user.adminId);
    
    // 3. Повертаємо результат
    res.status(201).json({
      message: 'Кімната створена',
      room
    });
  } catch (error) {
    // 4. Обробка помилок
    res.status(400).json({ message: error.message });
  }
};
```

## Права доступу
- **superadmin** — доступ до всіх контролерів
- **admin** — доступ до кімнат та користувачів свого готелю
- **editor** — тільки зміна статусів та робота з проживаннями