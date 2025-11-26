// src/types/guest.ts
// Типи даних, які ми повертаємо в Guest API

// Статус проживання, який ми показуємо гостю
export type GuestStayStatus = "booked" | "occupied" | "completed" | "cancelled";

// Об'єкт, який отримає гість при відкритті лінку
export interface GuestStayView {
  stayId: number;
  hotelName: string | null;
  hotelAddress: string | null;

  roomNumber: string;
  stayStatus: GuestStayStatus;

  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD

  mainGuestName: string;
  extraGuestNames: string[];

  // Політика заїзду / виїзду (з адміна)
  policyCheckInHour: number | null;
  policyCheckOutHour: number | null;

  // Wi-Fi (можливі null, якщо не налаштовано) Тільки якщо status === occupied
  wifiName: string | null;
  wifiPassword: string | null;

  // Контакти готелю (обов'язково не робимо їх required — мало що)
  contactPhone: string | null;
  contactEmail: string | null;
}

// Відповідь при генерації токену доступу для гостя
export interface GenerateTokenResponse {
  message: string;
  token: string;
  url: string;
}

// Помилка доступу (коли токен невалідний, прострочений або відкликаний)
export interface GuestAccessErrorResponse {
  message: string;
}