# Entities (Сутності бази даних)

## Що це?
Entities — це TypeScript класи, які описують структуру таблиць в базі даних. TypeORM автоматично створює таблиці на основі цих класів.

## Структура
```
src/entities/
├── Admin.ts        # Користувачі (admin, editor)
├── Room.ts         # Кімнати
└── Stay.ts         # Проживання
```

## Основні сутності

### Admin.ts
```typescript
@Entity('admin')
export class Admin {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @Column({ type: 'enum', enum: ['superadmin', 'admin', 'editor'] })
  role: string;

  // ... інші поля
}
```

**Поля:**
- `id` — унікальний ідентифікатор
- `username` — ім'я користувача (унікальне)
- `password` — хешований пароль
- `role` — роль користувача
- `hotel_name` — назва готелю (для admin)
- `adminId` — ID власника (для editor)
- `isBlocked` — чи заблокований
- `checkInHour` / `checkOutHour` — години заселення/виїзду
- `defaultWifiName` / `defaultWifiPassword` — Wi-Fi налаштування за замовчуванням

### Room.ts
```typescript
@Entity('room')
export class Room {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  roomNumber: string;

  @Column()
  floor: number;

  @Column()
  capacity: number;

  @Column({ type: 'enum', enum: ['free', 'booked', 'occupied'] })
  status: string;

  // ... інші поля
}
```

**Поля:**
- `id` — унікальний ідентифікатор
- `roomNumber` — номер кімнати
- `floor` — поверх
- `capacity` — місткість
- `status` — поточний статус
- `checkInHour` / `checkOutHour` — індивідуальні години
- `wifiName` / `wifiPassword` — Wi-Fi дані
- `qrBarUrl` — QR код
- `mapPosition` — позиція на карті

### Stay.ts
```typescript
@Entity('stay')
export class Stay {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  mainGuestName: string;

  @Column({ type: 'date' })
  checkIn: Date;

  @Column({ type: 'date' })
  checkOut: Date;

  @Column({ type: 'enum', enum: ['booked', 'occupied', 'completed', 'cancelled'] })
  status: string;

  // ... інші поля
}
```

**Поля:**
- `id` — унікальний ідентифікатор
- `mainGuestName` — ім'я основного гостя
- `extraGuestNames` — додаткові гості (JSON масив)
- `checkIn` / `checkOut` — дати заїзду/виїзду
- `status` — статус проживання
- `balance` — баланс (може бути числом або рядком)

## Зв'язки між таблицями

### Admin ↔ Room
- **Один до багатьох** — один admin може мати багато кімнат
- **Зовнішній ключ:** `room.adminId → admin.id`

### Room ↔ Stay
- **Один до багатьох** — одна кімната може мати багато проживань
- **Зовнішній ключ:** `stay.roomId → room.id`

### Admin ↔ Stay (через Room)
- **Непрямий зв'язок** — admin керує проживаннями через свої кімнати

## Міграції
Коли змінюєш entities, потрібно створити міграцію:

```bash
# Згенерувати міграцію
npm run db:gen:init

# Застосувати міграцію
npm run db:migrate
```

## Приклад використання
```typescript
// Створення нової кімнати
const room = new Room();
room.roomNumber = '101';
room.floor = 1;
room.capacity = 2;
room.status = 'free';
room.adminId = adminId;

await roomRepository.save(room);
```

## Важливі моменти
- **Унікальність:** `roomNumber` + `adminId` має бути унікальним
- **Enum значення:** використовуй тільки дозволені значення
- **Дати:** зберігаються в форматі YYYY-MM-DD
- **JSON поля:** `extraGuestNames` зберігається як JSON масив