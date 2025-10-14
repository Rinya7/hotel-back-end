# Types (Типи TypeScript)

## Що це?
Types — це кастомні типи TypeScript, які описують структуру даних в додатку. Вони забезпечують типобезпеку та покращують читабельність коду.

## Структура
```
src/types/
├── INFO.md    # Цей файл
└── (майбутні типи)
```

## Основні типи

### Ролі користувачів
```typescript
export type UserRole = 'superadmin' | 'admin' | 'editor';

export interface User {
  id: number;
  username: string;
  role: UserRole;
  adminId: number;
  hotelName?: string;
  isBlocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Статуси кімнат
```typescript
export type RoomStatus = 'free' | 'booked' | 'occupied';

export interface Room {
  id: number;
  roomNumber: string;
  floor: number;
  capacity: number;
  status: RoomStatus;
  checkInHour?: number;
  checkOutHour?: number;
  wifiName?: string;
  wifiPassword?: string;
  qrBarUrl?: string;
  mapPosition?: string;
  adminId: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### Статуси проживань
```typescript
export type StayStatus = 'booked' | 'occupied' | 'completed' | 'cancelled';

export interface Stay {
  id: number;
  roomId: number;
  mainGuestName: string;
  extraGuestNames?: string[];
  checkIn: Date;
  checkOut: Date;
  balance: number | string;
  status: StayStatus;
  createdAt: Date;
  updatedAt: Date;
}
```

## DTO типи

### Запити (Request DTOs)
```typescript
export interface LoginRequest {
  username: string;
  password: string;
}

export interface CreateRoomRequest {
  roomNumber: string;
  floor: number;
  capacity: number;
  checkInHour?: number;
  checkOutHour?: number;
  wifiName?: string;
  wifiPassword?: string;
  qrBarUrl?: string;
  mapPosition?: string;
}

export interface CreateStayRequest {
  mainGuestName: string;
  extraGuestNames?: string[];
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  balance?: number | string;
  status?: StayStatus;
}

export interface UpdateRoomRequest {
  roomNumber?: string;
  floor?: number;
  capacity?: number;
  checkInHour?: number;
  checkOutHour?: number;
  wifiName?: string;
  wifiPassword?: string;
  qrBarUrl?: string;
  mapPosition?: string;
}
```

### Відповіді (Response DTOs)
```typescript
export interface LoginResponse {
  payload: {
    token: string;
    username: string;
    role: UserRole;
    adminId: number;
    hotelName?: string;
    policy?: {
      checkInHour: number;
      checkOutHour: number;
    };
  };
}

export interface RoomResponse {
  message: string;
  room: Room;
}

export interface StayResponse {
  message: string;
  stay: Stay;
}

export interface ErrorResponse {
  message: string;
  code?: string;
}
```

## Утилітарні типи

### Часткові типи
```typescript
export type PartialRoom = Partial<Room>;
export type PartialStay = Partial<Stay>;
export type PartialUser = Partial<User>;
```

### Обов'язкові поля
```typescript
export type RequiredRoom = Required<Room>;
export type RequiredStay = Required<Stay>;
```

### Вибіркові типи
```typescript
export type RoomCreateData = Pick<Room, 'roomNumber' | 'floor' | 'capacity'>;
export type RoomUpdateData = Partial<Pick<Room, 'roomNumber' | 'floor' | 'capacity'>>;
```

## Enum типи

### Ролі
```typescript
export enum UserRoleEnum {
  SUPERADMIN = 'superadmin',
  ADMIN = 'admin',
  EDITOR = 'editor'
}
```

### Статуси кімнат
```typescript
export enum RoomStatusEnum {
  FREE = 'free',
  BOOKED = 'booked',
  OCCUPIED = 'occupied'
}
```

### Статуси проживань
```typescript
export enum StayStatusEnum {
  BOOKED = 'booked',
  OCCUPIED = 'occupied',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}
```

## Generic типи

### API відповіді
```typescript
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
```

### Фільтри
```typescript
export interface RoomFilter {
  status?: RoomStatus;
  floor?: number;
  capacity?: number;
  adminId?: number;
}

export interface StayFilter {
  status?: StayStatus;
  roomId?: number;
  checkInFrom?: Date;
  checkInTo?: Date;
  checkOutFrom?: Date;
  checkOutTo?: Date;
}
```

## Типи для валідації

### Валідаційні схеми
```typescript
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}
```

### Валідаційні функції
```typescript
export type Validator<T> = (value: T) => ValidationResult;

export interface FieldValidator {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: Validator<any>;
}
```

## Типи для конфігурації

### База даних
```typescript
export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  synchronize: boolean;
  logging: boolean;
}
```

### JWT
```typescript
export interface JWTConfig {
  secret: string;
  expiresIn: string;
  algorithm: string;
}
```

### Сервер
```typescript
export interface ServerConfig {
  port: number;
  host: string;
  cors: {
    origin: string[];
    credentials: boolean;
  };
  rateLimit: {
    windowMs: number;
    max: number;
  };
}
```

## Типи для тестування

### Mock дані
```typescript
export interface MockUser extends Omit<User, 'id' | 'createdAt' | 'updatedAt'> {
  id?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MockRoom extends Omit<Room, 'id' | 'createdAt' | 'updatedAt'> {
  id?: number;
  createdAt?: Date;
  updatedAt?: Date;
}
```

### Тестові сценарії
```typescript
export interface TestScenario {
  name: string;
  setup: () => Promise<void>;
  test: () => Promise<void>;
  cleanup: () => Promise<void>;
}
```

## Експорт типів

### Основні типи
```typescript
// src/types/index.ts
export * from './user.types';
export * from './room.types';
export * from './stay.types';
export * from './auth.types';
export * from './common.types';
```

### Використання
```typescript
import { User, Room, Stay, UserRole, RoomStatus } from '../types';
import type { CreateRoomRequest, LoginResponse } from '../types';
```

## Важливі моменти
- **Використовуйте інтерфейси для об'єктів**
- **Використовуйте type для union типів**
- **Експортуйте типи через index.ts**
- **Документуйте складні типи**
- **Використовуйте generic для повторного використання**
- **Розділяйте типи за функціональністю**