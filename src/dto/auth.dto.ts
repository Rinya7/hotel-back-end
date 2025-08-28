//DTO для авторизації
//src/dto/auth.dto.ts
// backend/src/dto/auth.dto.ts

import type { Role } from "../auth/roles";

// Тіло запиту на логін
export interface LoginRequestDto {
  username: string;
  password: string;
}

// Те, що ми тепер віддаємо після логіну (Варіант B)
// ВАЖЛИВО: token лишається з тим самим payload (adminId, role, sub),
// щоб не ламати існуючий middleware і контролери.
// Response we return after login
// IMPORTANT: keep the shape stable for middlewares (token unchanged).
export interface LoginResponseDto {
  token: string; // JWT
  username: string; // from DB
  role: Role; // 'superadmin' | 'admin' | 'editor'

  // adminId = hotel owner id:
  //  - for admin: own id
  //  - for editor: createdBy (owner) id
  adminId?: number;

  // Hotel display name (for admin: own; for editor: owner's)
  hotelName?: string;

  // ⬇️ NEW: expose hotel default policy hours to the frontend
  // For admin: take from self; for editor: from createdBy (owner).
  // For superadmin: may be undefined (no hotel).
  policy?: {
    checkInHour: number;
    checkOutHour: number;
  };
}
