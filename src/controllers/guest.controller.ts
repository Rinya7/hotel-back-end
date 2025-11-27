// src/controllers/guest.controller.ts
// Контролер для роботи з гостьовим доступом (токени та перегляд даних проживання)

import { Request, Response } from "express";
import { DataSource, Not, IsNull } from "typeorm";
import crypto from "crypto";
import { Stay } from "../entities/Stay";
import { GuestAccessToken } from "../entities/GuestAccessToken";
import { Room } from "../entities/Room";
import { Admin } from "../entities/Admin";
import { AuthRequest } from "../middlewares/authMiddleware";
import {
  GuestStayView,
  GenerateTokenResponse,
  GuestAccessErrorResponse,
} from "../types/guest";
import { ROLES } from "../auth/roles";

// Щоб не тягнути сюди логіку створення DataSource, ми очікуємо,
// що ззовні нам передадуть уже готовий dataSource (як у інших контролерах)
export class GuestController {
  private dataSource: DataSource;

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
  }

  /**
   * POST /guest/stays/:stayId/link
   * Створює (або повертає існуючий активний) токен для доступу гостя.
   * Викликається з адмінки (admin/editor).
   * Повертає готовий URL для відправки гостю.
   */
  createGuestAccessLink = async (
    req: AuthRequest,
    res: Response<GenerateTokenResponse | GuestAccessErrorResponse>
  ): Promise<Response> => {
    const stayIdParam: string = req.params.stayId as string;
    const stayId: number = Number(stayIdParam);

    if (Number.isNaN(stayId) || stayId <= 0) {
      return res.status(400).json({ message: "Invalid stayId parameter" });
    }

    // Перевірка прав доступу (middleware вже перевірив, але для безпеки)
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (
      req.user.role !== ROLES.ADMIN &&
      req.user.role !== ROLES.EDITOR &&
      req.user.role !== ROLES.SUPER
    ) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const stayRepo = this.dataSource.getRepository(Stay);
    const tokenRepo = this.dataSource.getRepository(GuestAccessToken);

    // Завантажуємо stay разом з room і admin, щоб перевірити права
    const stay = await stayRepo.findOne({
      where: { id: stayId },
      relations: ["room", "room.admin"],
    });

    if (!stay) {
      return res.status(404).json({ message: "Stay not found" });
    }

    const room: Room | undefined = stay.room;
    
    // Перевірка наявності room
    if (!room) {
      return res.status(404).json({ message: "Room not found for this stay" });
    }
    
    const admin: Admin | undefined = room.admin;
    
    // Перевірка наявності admin (опціонально, але бажано для повної інформації)
    if (!admin) {
      return res.status(404).json({ message: "Admin not found for this room" });
    }

    // Якщо роль admin/editor — перевіряємо, що це їхній готель
    // Superadmin має доступ до всіх готелів
    if (
      req.user.role !== ROLES.SUPER &&
      req.user.adminId &&
      admin &&
      admin.id !== req.user.adminId
    ) {
      return res.status(403).json({ message: "Access denied for this stay" });
    }

    // ✅ Спробуємо знайти вже існуючий НЕ відкликаний і не протухлий токен
    const now: Date = new Date();

    const existingToken = await tokenRepo.findOne({
      where: [
        {
          stay: { id: stay.id },
          revokedAt: IsNull(),
          expiresAt: IsNull(),
        },
        {
          stay: { id: stay.id },
          revokedAt: IsNull(),
          expiresAt: Not(IsNull()),
        },
      ],
      relations: ["stay"],
    });

    let tokenEntity: GuestAccessToken;

    if (existingToken && (!existingToken.expiresAt || existingToken.expiresAt > now)) {
      // Якщо є валідний токен — повертаємо його, не створюючи новий
      tokenEntity = existingToken;
    } else {
      // Інакше створюємо новий токен
      tokenEntity = new GuestAccessToken();
      tokenEntity.stay = stay;

      // Генеруємо безпечний випадковий токен (32 байти → 64 hex символи)
      tokenEntity.token = this.generateSecureToken();

      // Наприклад, зробимо токен безстроковим на старті
      tokenEntity.expiresAt = null;
      tokenEntity.revokedAt = null;
      tokenEntity.lastUsedAt = null;

      tokenEntity = await tokenRepo.save(tokenEntity);
    }

    // Базовий URL для гостьового додатку
    // Бере з env (GUEST_APP_BASE_URL) або використовує localhost для розробки
    const baseUrl: string =
      process.env.GUEST_APP_BASE_URL ?? 
      (process.env.NODE_ENV === "production" 
        ? "http://46.224.81.114:3000" 
        : "http://localhost:5174");

    // Повний URL, який ми будемо відправляти гостю
    const guestUrl: string = `${baseUrl}/access/${encodeURIComponent(
      tokenEntity.token
    )}`;

    return res.status(200).json({
      message: "Guest access link generated",
      token: tokenEntity.token,
      url: guestUrl,
    });
  };

  /**
   * GET /guest/access/:token
   * Викликається гостем з лінку. Повертає дані по його проживанню в безпечному вигляді.
   * Публічний ендпоінт (без авторизації), доступ тільки по токену.
   */
  getGuestAccessByToken = async (
    req: Request,
    res: Response<GuestStayView | GuestAccessErrorResponse>
  ): Promise<Response> => {
    const tokenValue: string = req.params.token as string;

    if (!tokenValue || tokenValue.trim().length < 10) {
      return res.status(400).json({ message: "Invalid token" });
    }

    const tokenRepo = this.dataSource.getRepository(GuestAccessToken);

    const tokenEntity = await tokenRepo.findOne({
      where: { token: tokenValue },
      relations: ["stay", "stay.room", "stay.room.admin"],
    });

    if (!tokenEntity) {
      return res.status(404).json({ message: "Guest access not found" });
    }

    const now: Date = new Date();

    if (tokenEntity.revokedAt) {
      return res.status(410).json({ message: "Access revoked" });
    }

    if (tokenEntity.expiresAt && tokenEntity.expiresAt <= now) {
      return res.status(410).json({ message: "Access expired" });
    }

    const stay: Stay = tokenEntity.stay;
    
    // Перевірка наявності stay
    if (!stay) {
      return res.status(404).json({ message: "Stay not found" });
    }
    
    const room: Room | undefined = stay.room;
    
    // Перевірка наявності room
    if (!room) {
      return res.status(404).json({ message: "Room not found for this stay" });
    }
    
    const admin: Admin | undefined = room.admin;

    // Оновлюємо lastUsedAt для статистики (але не чекаємо на це в відповіді)
    tokenEntity.lastUsedAt = now;
    void tokenRepo.save(tokenEntity).catch(() => {
      // Логувати сюди помилку не обов'язково, головне — не падати
    });

    const view: GuestStayView = this.mapStayToGuestView(stay, room, admin ?? null);

    return res.status(200).json(view);
  };

  // ================== ВНУТРІШНІ ДОПОМІЖНІ МЕТОДИ ==================

  /**
   * Генерація безпечного випадкового токену
   * Використовує crypto.randomBytes для криптографічно стійкої генерації
   * @returns 64-символьний hex рядок (32 байти)
   */
  private generateSecureToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  /**
   * Мапимо Stay + Room + Admin → GuestStayView (що можна показати гостю)
   * Приховуємо внутрішні технічні дані, залишаємо тільки те, що потрібно гостю.
   * Wi-Fi показуємо тільки для статусів occupied (логіка в майбутньому може розширитись).
   */
  private mapStayToGuestView(stay: Stay, room: Room, admin: Admin | null): GuestStayView {
    const mainGuestName: string = stay.mainGuestName;
    const extraGuestNames: string[] = Array.isArray(stay.extraGuestNames)
      ? stay.extraGuestNames
      : [];

    // Конвертуємо Date в YYYY-MM-DD формат
    const checkInDate: Date = stay.checkIn instanceof Date ? stay.checkIn : new Date(stay.checkIn);
    const checkOutDate: Date = stay.checkOut instanceof Date ? stay.checkOut : new Date(stay.checkOut);
    const checkIn: string = checkInDate.toISOString().split("T")[0] ?? "";
    const checkOut: string = checkOutDate.toISOString().split("T")[0] ?? "";

    // Wi-Fi: спочатку з кімнати, потім fallback на дефолти готелю
    // Показуємо Wi-Fi тільки для occupied (можна розширити логіку)
    const shouldShowWifi: boolean = stay.status === "occupied";
    const wifiName: string | null = shouldShowWifi
      ? room.wifiName ?? (admin?.defaultWifiName ?? null)
      : null;
    const wifiPassword: string | null = shouldShowWifi
      ? room.wifiPassword ?? (admin?.defaultWifiPassword ?? null)
      : null;

    // Назва та адреса готелю
    const hotelName: string | null = admin?.hotel_name ?? null;
    // Формуємо адресу з полів Admin (якщо є утиліта для цього, використай її)
    const hotelAddress: string | null = admin
      ? this.formatHotelAddress(admin)
      : null;

    // Політика заїзду/виїзду
    const policyCheckInHour: number | null = admin?.checkInHour ?? null;
    const policyCheckOutHour: number | null = admin?.checkOutHour ?? null;

    // Контакти готелю
    const contactPhone: string | null = admin
      ? this.formatPhoneNumber(admin.phoneCountryCode, admin.phoneNumber)
      : null;
    const contactEmail: string | null = admin?.email ?? null;

    const view: GuestStayView = {
      stayId: stay.id,
      hotelName,
      hotelAddress,
      roomNumber: room.roomNumber,
      stayStatus: stay.status as GuestStayView["stayStatus"],
      checkIn,
      checkOut,
      mainGuestName,
      extraGuestNames,
      policyCheckInHour,
      policyCheckOutHour,
      wifiName,
      wifiPassword,
      contactPhone,
      contactEmail,
    };

    return view;
  }

  /**
   * Форматує адресу готелю з полів Admin entity
   * @param admin - сутність Admin з полями адреси
   * @returns відформатована адреса або null
   */
  private formatHotelAddress(admin: Admin): string | null {
    const parts: string[] = [];

    if (admin.street) parts.push(admin.street);
    if (admin.buildingNumber) parts.push(admin.buildingNumber);
    if (admin.apartmentNumber) parts.push(admin.apartmentNumber);
    if (admin.postalCode) parts.push(admin.postalCode);
    if (admin.province) parts.push(admin.province);
    if (admin.country) parts.push(admin.country);

    return parts.length > 0 ? parts.join(", ") : null;
  }

  /**
   * Форматує номер телефону з коду країни та номера
   * @param countryCode - код країни (наприклад, "+39", "+380")
   * @param phoneNumber - номер телефону
   * @returns відформатований номер або null
   */
  private formatPhoneNumber(
    countryCode: string | null | undefined,
    phoneNumber: string | null | undefined
  ): string | null {
    if (!phoneNumber) return null;

    if (countryCode) {
      // Прибираємо зайві пробіли та "+" якщо вже є
      const cleanCode = countryCode.trim().replace(/^\+/, "");
      const cleanNumber = phoneNumber.trim();
      return `+${cleanCode} ${cleanNumber}`;
    }

    return phoneNumber.trim();
  }

  /**
   * GET /guest/stays/:stayId/tokens
   * Отримує список всіх токенів доступу для конкретного проживання.
   * Викликається з адмінки (admin/editor).
   * Повертає список токенів з їх статусами.
   */
  getGuestAccessTokens = async (
    req: AuthRequest,
    res: Response
  ): Promise<Response> => {
    try {
      const stayIdParam: string = req.params.stayId as string;
      const stayId: number = Number(stayIdParam);

      if (Number.isNaN(stayId) || stayId <= 0) {
        return res.status(400).json({ message: "Invalid stayId parameter" });
      }

      // Перевірка прав доступу
      if (!req.user) {
        console.error("[getGuestAccessTokens] No user in request");
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      if (req.user.role !== ROLES.ADMIN && req.user.role !== ROLES.EDITOR && req.user.role !== ROLES.SUPER) {
        console.error("[getGuestAccessTokens] Invalid role:", req.user.role);
        return res.status(403).json({ message: "Access denied" });
      }
      

    const stayRepo = this.dataSource.getRepository(Stay);
    const tokenRepo = this.dataSource.getRepository(GuestAccessToken);

    // Перевіряємо, що stay існує та належить поточному адміну
    const stay = await stayRepo.findOne({
      where: { id: stayId },
      relations: ["room", "room.admin"],
    });

    if (!stay) {
      return res.status(404).json({ message: "Stay not found" });
    }

    // Перевірка прав доступу до stay
    // Для редакторів використовуємо adminId (ID власника готелю), для superadmin - ID з stay
    let ownerAdminId: number;
    if (req.user.role === ROLES.SUPER) {
      ownerAdminId = stay.room.admin.id;
    } else {
      // Для admin та editor використовуємо getOwnerAdminId для консистентності
      const { getOwnerAdminId } = await import("../utils/owner");
      ownerAdminId = getOwnerAdminId(req);
    }

    if (stay.room.admin.id !== ownerAdminId && req.user.role !== ROLES.SUPER) {
      return res.status(403).json({ message: "Access denied" });
    }

      // Отримуємо всі токени для цього stay
      const tokens = await tokenRepo.find({
        where: { stay: { id: stayId } },
        order: { createdAt: "DESC" },
      });

      // Форматуємо відповідь
      const tokensResponse = tokens.map((token) => ({
        id: token.id,
        token: token.token,
        createdAt: token.createdAt.toISOString(),
        expiresAt: token.expiresAt ? token.expiresAt.toISOString() : null,
        revokedAt: token.revokedAt ? token.revokedAt.toISOString() : null,
        lastUsedAt: token.lastUsedAt ? token.lastUsedAt.toISOString() : null,
      }));

      return res.status(200).json(tokensResponse);
    } catch (error) {
      console.error("[getGuestAccessTokens] Error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      // Якщо помилка з getOwnerAdminId - повертаємо 401/403
      if (errorMessage.includes("No auth user") || errorMessage.includes("Invalid adminId")) {
        return res.status(401).json({ 
          message: "Authentication error", 
          error: errorMessage 
        });
      }
      return res.status(500).json({ 
        message: "Failed to fetch guest tokens",
        error: errorMessage 
      });
    }
  };
}
