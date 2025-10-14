# Utils (Утиліти)

## Що це?
Utils — це допоміжні функції, які використовуються в різних частинах додатку. Вони містять загальну логіку, яку можна перевикористовувати.

## Структура
```
src/utils/
├── copyHotelDataFromAdmin.ts  # Копіювання даних готелю
├── hours.ts                   # Робота з годинами
├── owner.ts                   # Власники
├── policy.ts                  # Політики
└── INFO.md                   # Цей файл
```

## Основні утиліти

### copyHotelDataFromAdmin.ts
**Призначення:** Копіювання даних готелю від адміна до редактора

**Функції:**
- `copyHotelData(admin: Admin, editor: Admin): void` — копіює дані готелю

**Як працює:**
1. Копіює назву готелю
2. Копіює адресу
3. Копіює години заселення/виїзду
4. Копіює логотип
5. Встановлює зв'язок editor → admin

### hours.ts
**Призначення:** Робота з годинами заселення/виїзду

**Функції:**
- `validateHour(hour: number): boolean` — валідація години (0-23)
- `formatHour(hour: number): string` — форматування години
- `getDefaultCheckInHour(): number` — дефолтна година заселення
- `getDefaultCheckOutHour(): number` — дефолтна година виїзду

**Приклад:**
```typescript
import { validateHour, formatHour } from '../utils/hours';

const hour = 15;
if (validateHour(hour)) {
  console.log(`Check-in time: ${formatHour(hour)}`); // "15:00"
}
```

### owner.ts
**Призначення:** Робота з власниками готелів

**Функції:**
- `getOwnerId(user: User): number` — отримати ID власника
- `isOwner(user: User, adminId: number): boolean` — перевірка власника
- `getOwnerInfo(adminId: number): Promise<Admin>` — інформація про власника

**Приклад:**
```typescript
import { getOwnerId, isOwner } from '../utils/owner';

const user = req.user;
const adminId = getOwnerId(user); // Для admin — його ID, для editor — ID admin

if (isOwner(user, targetAdminId)) {
  // Користувач є власником
}
```

### policy.ts
**Призначення:** Робота з політиками готелю

**Функції:**
- `getHotelPolicy(adminId: number): Promise<HotelPolicy>` — отримати політику готелю
- `updateHotelPolicy(adminId: number, policy: PolicyUpdate): Promise<void>` — оновити політику
- `applyPolicyToRoom(roomId: number, policy: HotelPolicy): Promise<void>` — застосувати політику до кімнати

**Приклад:**
```typescript
import { getHotelPolicy, applyPolicyToRoom } from '../utils/policy';

const policy = await getHotelPolicy(adminId);
await applyPolicyToRoom(roomId, policy);
```

## Типові утиліти

### Валідація
```typescript
// utils/validation.ts
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone);
};

export const validateRoomNumber = (roomNumber: string): boolean => {
  return /^[A-Z0-9]+$/.test(roomNumber);
};
```

### Форматування
```typescript
// utils/format.ts
export const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('uk-UA', {
    style: 'currency',
    currency: 'UAH'
  }).format(amount);
};

export const formatPhone = (phone: string): string => {
  return phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
};
```

### Генерація
```typescript
// utils/generator.ts
export const generateRoomNumber = (floor: number, room: number): string => {
  return `${floor}${room.toString().padStart(2, '0')}`;
};

export const generateQRCode = (roomId: number): string => {
  return `https://hotel.com/room/${roomId}/qr`;
};

export const generatePassword = (length: number = 8): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};
```

### Конвертація
```typescript
// utils/converter.ts
export const stringToDate = (dateString: string): Date => {
  return new Date(dateString);
};

export const dateToString = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const numberToString = (num: number): string => {
  return num.toString();
};

export const stringToNumber = (str: string): number => {
  return parseInt(str, 10);
};
```

## Константи

### Конфігурація
```typescript
// utils/constants.ts
export const DEFAULT_CHECK_IN_HOUR = 15;
export const DEFAULT_CHECK_OUT_HOUR = 11;
export const MAX_ROOM_CAPACITY = 10;
export const MIN_ROOM_CAPACITY = 1;
export const MAX_FLOOR = 50;
export const MIN_FLOOR = 0;
```

### Повідомлення
```typescript
// utils/messages.ts
export const MESSAGES = {
  SUCCESS: {
    ROOM_CREATED: 'Room created successfully',
    ROOM_UPDATED: 'Room updated successfully',
    ROOM_DELETED: 'Room deleted successfully',
    STAY_CREATED: 'Stay created successfully',
    STAY_UPDATED: 'Stay updated successfully',
    STAY_CLOSED: 'Stay closed successfully'
  },
  ERROR: {
    ROOM_NOT_FOUND: 'Room not found',
    ROOM_ALREADY_EXISTS: 'Room number already exists',
    STAY_NOT_FOUND: 'Stay not found',
    INVALID_DATES: 'Invalid check-in/check-out dates',
    ROOM_OCCUPIED: 'Room is occupied'
  }
};
```

## Хелпери

### Робота з датами
```typescript
// utils/dateHelpers.ts
export const isDateInRange = (date: Date, start: Date, end: Date): boolean => {
  return date >= start && date <= end;
};

export const getDaysBetween = (start: Date, end: Date): number => {
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};
```

### Робота з масивами
```typescript
// utils/arrayHelpers.ts
export const groupBy = <T>(array: T[], key: keyof T): Record<string, T[]> => {
  return array.reduce((groups, item) => {
    const group = String(item[key]);
    groups[group] = groups[group] || [];
    groups[group].push(item);
    return groups;
  }, {} as Record<string, T[]>);
};

export const unique = <T>(array: T[]): T[] => {
  return [...new Set(array)];
};

export const sortBy = <T>(array: T[], key: keyof T, direction: 'asc' | 'desc' = 'asc'): T[] => {
  return array.sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });
};
```

## Логування

### Логгер
```typescript
// utils/logger.ts
export class Logger {
  static info(message: string, data?: any): void {
    console.log(`[INFO] ${message}`, data);
  }
  
  static error(message: string, error?: Error): void {
    console.error(`[ERROR] ${message}`, error);
  }
  
  static warn(message: string, data?: any): void {
    console.warn(`[WARN] ${message}`, data);
  }
  
  static debug(message: string, data?: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${message}`, data);
    }
  }
}
```

## Кешування

### Простий кеш
```typescript
// utils/cache.ts
export class SimpleCache<T> {
  private cache = new Map<string, { data: T; expires: number }>();
  
  set(key: string, data: T, ttl: number = 300000): void { // 5 хвилин
    const expires = Date.now() + ttl;
    this.cache.set(key, { data, expires });
  }
  
  get(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }
  
  clear(): void {
    this.cache.clear();
  }
}
```

## Важливі моменти
- **Один файл = одна функціональність**
- **Експортуйте функції через index.ts**
- **Документуйте складні функції**
- **Використовуйте TypeScript для типобезпеки**
- **Тестуйте утиліти окремо**
- **Не мішайте HTTP логіку з утилітами**