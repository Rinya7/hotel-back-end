# DTO (Data Transfer Objects)

## Призначення папки

Папка містить Data Transfer Objects - типи для передачі даних між клієнтом та сервером. DTO визначають структуру запитів та відповідей API.

## Структура

```
src/dto/
└── auth.dto.ts          # DTO для авторизації
```

## Файли

### auth.dto.ts

**Призначення:** Типи для запитів та відповідей API авторизації.

**Що містить:**

1. **LoginRequestDto:**
   ```typescript
   interface LoginRequestDto {
     username: string;
     password: string;
   }
   ```
   - Тіло запиту для логіну
   - Використовується в POST /auth/login

2. **LoginResponseDto:**
   ```typescript
   interface LoginResponseDto {
     token: string;        // JWT токен
     username: string;     // Ім'я користувача
     role: Role;          // Роль користувача
     adminId?: number;     // ID власника готелю
     hotelName?: string;  // Назва готелю
     policy?: {            // Політика часу готелю
       checkInHour: number;
       checkOutHour: number;
     };
   }
   ```
   - Відповідь після успішного логіну
   - Містить JWT токен та інформацію про користувача

**Використання:**

- В контролері `auth.controller.ts` для типізації запитів/відповідей
- Валідація через OpenAPI схему
- Типізація на фронтенді

**Приклад використання:**

```typescript
import { LoginRequestDto, LoginResponseDto } from "../dto/auth.dto";

export const login = async (
  req: Request<{}, LoginResponseDto, LoginRequestDto>,
  res: Response<LoginResponseDto>
) => {
  // Логіка логіну
};
```

## Важливі моменти

- **Типізація** - всі DTO строго типізовані
- **Відповідність OpenAPI** - DTO мають відповідати OpenAPI схемі
- **Стабільність** - структура DTO не повинна змінюватися без версіонування API
- **Документація** - кожен DTO має коментарі з поясненням полів

## Майбутні DTO

Можуть бути додані DTO для інших модулів:
- `room.dto.ts` - для операцій з кімнатами
- `stay.dto.ts` - для операцій з проживаннями
- `guest.dto.ts` - для гостьового API

---

**Останнє оновлення:** 2025-01-XX




