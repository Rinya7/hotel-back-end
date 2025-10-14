# Services (Сервіси)

## Що це?
Services — це бізнес-логіка додатку. Вони містять всю логіку, яка не пов'язана напряму з HTTP запитами. Контролери викликають сервіси для обробки даних.

## Структура
```
src/services/
├── statusService.ts    # Сервіс статусів
└── INFO.md           # Цей файл
```

## Основні сервіси

### statusService.ts
**Призначення:** Автоматичне оновлення статусів кімнат та проживань

**Функції:**
- `updateRoomStatuses()` — оновлює статуси кімнат на основі активних проживань
- `updateStayStatuses()` — оновлює статуси проживань на основі дат
- `checkExpiredStays()` — перевіряє застарілі бронювання

**Як працює:**
1. Запускається по розкладу (cron job)
2. Перевіряє всі активні проживання
3. Оновлює статуси кімнат та проживань
4. Логує результати

## Принципи роботи

### Розділення відповідальності
- **Controllers** — обробка HTTP запитів
- **Services** — бізнес-логіка
- **Entities** — структура даних
- **Repositories** — робота з БД

### Приклад структури
```typescript
// Controller
export const createRoom = async (req: Request, res: Response) => {
  try {
    const roomData = req.body;
    const adminId = req.user.adminId;
    
    // Викликаємо сервіс
    const room = await roomService.createRoom(roomData, adminId);
    
    res.status(201).json({ message: 'Room created', room });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Service
export class RoomService {
  async createRoom(roomData: CreateRoomRequest, adminId: number): Promise<Room> {
    // Бізнес-логіка
    const room = new Room();
    room.roomNumber = roomData.roomNumber;
    room.floor = roomData.floor;
    room.capacity = roomData.capacity;
    room.adminId = adminId;
    
    // Валідація
    await this.validateRoom(room);
    
    // Збереження
    return await roomRepository.save(room);
  }
  
  private async validateRoom(room: Room): Promise<void> {
    // Перевірка унікальності
    const existing = await roomRepository.findOne({
      where: { roomNumber: room.roomNumber, adminId: room.adminId }
    });
    
    if (existing) {
      throw new Error('Room number already exists');
    }
  }
}
```

## Типові сервіси

### RoomService
```typescript
export class RoomService {
  async createRoom(data: CreateRoomRequest, adminId: number): Promise<Room>
  async updateRoom(id: number, data: UpdateRoomRequest): Promise<Room>
  async deleteRoom(id: number): Promise<void>
  async getRoomsByAdmin(adminId: number): Promise<Room[]>
  async updateRoomStatus(id: number, status: RoomStatus): Promise<Room>
}
```

### StayService
```typescript
export class StayService {
  async createStay(data: CreateStayRequest, roomId: number): Promise<Stay>
  async updateStay(id: number, data: UpdateStayRequest): Promise<Stay>
  async closeStay(id: number, status: StayStatus): Promise<Stay>
  async getStaysByRoom(roomId: number): Promise<Stay[]>
  async checkIn(id: number): Promise<Stay>
  async checkOut(id: number): Promise<Stay>
  async cancel(id: number): Promise<Stay>
}
```

### AuthService
```typescript
export class AuthService {
  async login(username: string, password: string): Promise<LoginResponse>
  async createAdmin(data: CreateAdminRequest): Promise<Admin>
  async createEditor(data: CreateEditorRequest, adminId: number): Promise<Admin>
  async blockUser(username: string): Promise<void>
  async unblockUser(username: string): Promise<void>
  async deleteUser(username: string): Promise<void>
}
```

## Обробка помилок

### Типові помилки
```typescript
// Валідація
if (!roomData.roomNumber) {
  throw new Error('Room number is required');
}

// Бізнес-логіка
const existingRoom = await roomRepository.findOne({
  where: { roomNumber: roomData.roomNumber, adminId }
});

if (existingRoom) {
  throw new Error('Room number already exists');
}

// Доступ
if (user.role !== 'admin' && user.role !== 'superadmin') {
  throw new Error('Insufficient permissions');
}
```

### Кастомні помилки
```typescript
export class BusinessError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'BusinessError';
  }
}

// Використання
if (room.status === 'occupied') {
  throw new BusinessError('Room is occupied', 'ROOM_OCCUPIED');
}
```

## Транзакції

### Приклад транзакції
```typescript
export class StayService {
  async createStay(data: CreateStayRequest, roomId: number): Promise<Stay> {
    return await dataSource.transaction(async manager => {
      // 1. Створити проживання
      const stay = new Stay();
      stay.mainGuestName = data.mainGuestName;
      stay.roomId = roomId;
      stay.checkIn = data.checkIn;
      stay.checkOut = data.checkOut;
      stay.status = 'booked';
      
      const savedStay = await manager.save(stay);
      
      // 2. Оновити статус кімнати
      await manager.update(Room, roomId, { status: 'booked' });
      
      return savedStay;
    });
  }
}
```

## Кешування

### Приклад кешування
```typescript
export class RoomService {
  private cache = new Map();
  
  async getRoomsByAdmin(adminId: number): Promise<Room[]> {
    const cacheKey = `rooms_${adminId}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    const rooms = await roomRepository.find({
      where: { adminId }
    });
    
    this.cache.set(cacheKey, rooms);
    return rooms;
  }
  
  async updateRoom(id: number, data: UpdateRoomRequest): Promise<Room> {
    const room = await roomRepository.update(id, data);
    
    // Очистити кеш
    this.cache.delete(`rooms_${room.adminId}`);
    
    return room;
  }
}
```

## Логування

### Приклад логування
```typescript
export class RoomService {
  async createRoom(data: CreateRoomRequest, adminId: number): Promise<Room> {
    console.log(`Creating room ${data.roomNumber} for admin ${adminId}`);
    
    try {
      const room = await this.doCreateRoom(data, adminId);
      console.log(`Room created successfully: ${room.id}`);
      return room;
    } catch (error) {
      console.error(`Failed to create room: ${error.message}`);
      throw error;
    }
  }
}
```

## Тестування

### Приклад тесту
```typescript
describe('RoomService', () => {
  let roomService: RoomService;
  
  beforeEach(() => {
    roomService = new RoomService();
  });
  
  it('should create room', async () => {
    const roomData = {
      roomNumber: '101',
      floor: 1,
      capacity: 2
    };
    
    const room = await roomService.createRoom(roomData, 1);
    
    expect(room.roomNumber).toBe('101');
    expect(room.floor).toBe(1);
    expect(room.capacity).toBe(2);
  });
});
```

## Важливі моменти
- **Один сервіс = одна відповідальність**
- **Не мішати HTTP логіку з бізнес-логікою**
- **Використовувати транзакції для складних операцій**
- **Обробляти помилки на рівні сервісів**
- **Логувати важливі операції**