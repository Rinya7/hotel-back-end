# Middlewares (Проміжне програмне забезпечення)

## Що це?
Middleware — це функції, які виконуються між отриманням запиту і відправкою відповіді. Вони можуть обробляти запити, додавати дані, перевіряти права доступу тощо.

## Структура
```
src/middlewares/
├── authMiddleware.ts    # Перевірка аутентифікації
└── INFO.md             # Цей файл
```

## Основні middleware

### authMiddleware.ts
**Призначення:** Перевіряє JWT токен і додає інформацію про користувача до запиту.

**Як працює:**
1. Отримує токен з заголовка `Authorization: Bearer <token>`
2. Перевіряє валідність токену
3. Декодує дані користувача
4. Додає `req.user` з інформацією про користувача
5. Передає управління наступному middleware/контролеру

**Приклад використання:**
```typescript
// В routes
router.get('/rooms', authMiddleware, getRooms);

// В контролері
export const getRooms = async (req: Request, res: Response) => {
  // req.user містить дані користувача
  const adminId = req.user.adminId;
  const role = req.user.role;
  // ...
};
```

**Дані в req.user:**
```typescript
interface User {
  id: number;
  username: string;
  role: 'superadmin' | 'admin' | 'editor';
  adminId: number; // ID власника готелю
  hotelName?: string;
}
```

## Вбудовані middleware

### express.json()
- Парсить JSON з body запиту
- Додає `req.body` з даними

### cors()
- Обробляє CORS запити
- Дозволяє запити з frontend (http://localhost:5173)

### helmet()
- Додає заголовки безпеки
- Захищає від XSS, clickjacking тощо

### rateLimit()
- Обмежує кількість запитів
- Захищає від DDoS атак
- Окремий ліміт для `/auth/login` (30 запитів/15 хв)

## Порядок виконання
```typescript
// src/app.ts
app.use(helmet());           // 1. Безпека
app.use(cors());            // 2. CORS
app.use(express.json());    // 3. Парсинг JSON
app.use(rateLimit());       // 4. Ліміти запитів
// ... routes з authMiddleware
```

## Перевірка прав доступу

### Superadmin
- Доступ до всіх endpoints
- Може створювати admin'ів
- Бачить всі кімнати в системі

### Admin
- Доступ до кімнат свого готелю
- Може створювати editor'ів
- Керує проживаннями

### Editor
- Тільки зміна статусів кімнат
- Робота з проживаннями
- НЕ може створювати користувачів/кімнати

## Обробка помилок
```typescript
// Якщо токен невалідний
if (!token || !isValidToken(token)) {
  return res.status(401).json({ message: 'Unauthorized' });
}

// Якщо користувач заблокований
if (user.isBlocked) {
  return res.status(403).json({ message: 'User is blocked' });
}
```

## Приклад створення власного middleware
```typescript
// middleware/logger.ts
export const loggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next(); // Важливо! Передати управління далі
};

// Використання
app.use(loggerMiddleware);
```

## Важливі моменти
- **next()** — обов'язково викликати для передачі управління
- **Порядок** — middleware виконуються в порядку додавання
- **Помилки** — обробляти в try-catch блоках
- **Токени** — зберігати в безпечному місці