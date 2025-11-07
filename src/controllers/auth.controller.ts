// src/controllers/auth.controller.ts
import { Request, Response } from "express";
import { AppDataSource } from "../config/data-source";
import { Admin } from "../entities/Admin";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { AuthRequest } from "../middlewares/authMiddleware";
import { copyHotelDataFromAdmin } from "../utils/copyHotelDataFromAdmin";
import type { LoginRequestDto, LoginResponseDto } from "../dto/auth.dto";
import { ROLES, Role } from "../auth/roles";
import { isHour, isHourOptional } from "../utils/hours";
import {
  geocodeAddress,
  buildFullAddress,
} from "../services/geocoding.service";
import { getRandomHotelLogo } from "../constants/defaults";

const JWT_SECRET = process.env.JWT_SECRET as string;

/**
 * 🔐 POST /auth/create-admin — superadmin only
 * Body:
 *  - username, password, confirmPassword, hotel_name, address, ...
 *  - checkInHour?: number(0..23)
 *  - checkOutHour?: number(0..23)
 */
export const createAdminBySuperadmin = async (
  req: AuthRequest,
  res: Response
) => {
  // ❗ Safety check: even if route is protected by middleware, double-check role here.
  if (!req.user || req.user.role !== ROLES.SUPER) {
    return res.status(403).json({ message: "Superadmin only" });
  }

  const {
    username,
    password,
    confirmPassword,
    hotel_name,
    // Детальная структура адреса
    street,
    buildingNumber,
    apartmentNumber,
    country,
    province,
    postalCode,
    latitude,
    longitude,
    full_name,
    // Телефон разделен на код и номер
    phoneCountryCode,
    phoneNumber,
    // Для обратной совместимости оставляем phone (будет игнорироваться если указаны phoneCountryCode и phoneNumber)
    phone,
    email,
    logo_url,
    checkInHour,
    checkOutHour,
    defaultWifiName,
    defaultWifiPassword,
  } = req.body as {
    username: string;
    password: string;
    confirmPassword: string;
    hotel_name: string;
    street?: string | null;
    buildingNumber?: string | null;
    apartmentNumber?: string | null;
    country?: string | null;
    province?: string | null;
    postalCode?: string | null;
    latitude?: string | number | null; // Может прийти как число или строка
    longitude?: string | number | null;
    full_name?: string;
    phoneCountryCode?: string | null;
    phoneNumber?: string | null;
    phone?: string; // Для обратной совместимости
    email?: string;
    logo_url?: string | null;
    checkInHour?: number | string; // Может прийти как число или строка из формы
    checkOutHour?: number | string; // Может прийти как число или строка из формы
    defaultWifiName?: string;
    defaultWifiPassword?: string;
  };

  // Обязательные поля: username, password, confirmPassword, hotel_name, street
  if (!username || !password || !confirmPassword || !hotel_name || !street) {
    return res.status(400).json({
      message:
        "username, password, confirmPassword, hotel_name and street are required",
    });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match" });
  }

  // Optional policy hours validation (0..23 if provided)
  // Нормализуем значения часов: конвертируем строки в числа, пустые строки в undefined
  let normalizedCheckInHour: number | undefined = undefined;
  let normalizedCheckOutHour: number | undefined = undefined;

  if (checkInHour !== undefined && checkInHour !== null) {
    if (typeof checkInHour === "string") {
      const trimmed = checkInHour.trim();
      if (trimmed !== "") {
        const parsed = parseInt(trimmed, 10);
        if (!Number.isNaN(parsed)) {
          normalizedCheckInHour = parsed;
        }
      }
    } else {
      // Это уже число
      normalizedCheckInHour = checkInHour;
    }
  }

  if (checkOutHour !== undefined && checkOutHour !== null) {
    if (typeof checkOutHour === "string") {
      const trimmed = checkOutHour.trim();
      if (trimmed !== "") {
        const parsed = parseInt(trimmed, 10);
        if (!Number.isNaN(parsed)) {
          normalizedCheckOutHour = parsed;
        }
      }
    } else {
      // Это уже число
      normalizedCheckOutHour = checkOutHour;
    }
  }

  if (
    !isHourOptional(normalizedCheckInHour) ||
    !isHourOptional(normalizedCheckOutHour)
  ) {
    return res
      .status(400)
      .json({ message: "checkInHour/checkOutHour must be integers in 0..23" });
  }

  const adminRepo = AppDataSource.getRepository(Admin);
  const existing = await adminRepo.findOneBy({ username });

  if (existing) {
    return res.status(400).json({ message: "Username already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  // Автоматически получаем координаты, если они не указаны, но есть адрес
  let finalLatitude = latitude;
  let finalLongitude = longitude;

  if (
    (!finalLatitude || !finalLongitude) &&
    street &&
    (buildingNumber || province || country)
  ) {
    const fullAddress = buildFullAddress({
      street,
      buildingNumber,
      apartmentNumber,
      province,
      postalCode,
      country,
    });

    try {
      const coords = await geocodeAddress(fullAddress);
      if (coords) {
        finalLatitude = coords.latitude;
        finalLongitude = coords.longitude;
      }
    } catch (error) {
      // Игнорируем ошибки геокодирования, координаты останутся null
    }
  }

  // Обработка телефона: приоритет у новых полей phoneCountryCode/phoneNumber
  let finalPhoneCountryCode = phoneCountryCode ?? null;
  let finalPhoneNumber = phoneNumber ?? null;

  // Если указан старый формат phone, пытаемся распарсить
  if (phone && !finalPhoneCountryCode && !finalPhoneNumber) {
    const phoneMatch = phone.match(/^(\+\d{1,3})(.*)$/);
    if (phoneMatch) {
      finalPhoneCountryCode = phoneMatch[1];
      finalPhoneNumber = phoneMatch[2].replace(/[^\d]/g, ""); // Убираем все кроме цифр
    } else {
      // Если нет кода страны, просто кладем в номер
      finalPhoneNumber = phone.replace(/[^\d]/g, "");
    }
  }

  // Create entity with hotel defaults.
  // If hours provided → override; else entity defaults (14/10) will be used.
  // Нормализуем строковые поля (пустые строки преобразуем в null)
  const newAdmin = adminRepo.create({
    username,
    password: hashedPassword,
    role: ROLES.ADMIN,
    isBlocked: false,
    hotel_name,
    // Детальная структура адреса (нормализуем пустые строки)
    street: normalizeNullableString(street) ?? null,
    buildingNumber: normalizeNullableString(buildingNumber) ?? null,
    apartmentNumber: normalizeNullableString(apartmentNumber) ?? null,
    country: normalizeNullableString(country) ?? null,
    province: normalizeNullableString(province) ?? null,
    postalCode: normalizeNullableString(postalCode) ?? null,
    latitude:
      finalLatitude !== undefined && finalLatitude !== null
        ? String(finalLatitude) // Сохраняем как строку (decimal в БД)
        : null,
    longitude:
      finalLongitude !== undefined && finalLongitude !== null
        ? String(finalLongitude)
        : null,
    full_name: normalizeNullableString(full_name) ?? undefined,
    phoneCountryCode: normalizeNullableString(finalPhoneCountryCode) ?? null,
    phoneNumber: normalizeNullableString(finalPhoneNumber) ?? null,
    email: normalizeNullableString(email) ?? undefined,
    // Если logo_url не указан или пустой, используем случайный логотип из вариантов
    logo_url: normalizeNullableString(logo_url) ?? getRandomHotelLogo(),
    ...(typeof normalizedCheckInHour !== "undefined"
      ? { checkInHour: normalizedCheckInHour }
      : {}),
    ...(typeof normalizedCheckOutHour !== "undefined"
      ? { checkOutHour: normalizedCheckOutHour }
      : {}),
    ...(defaultWifiName ? { defaultWifiName } : {}),
    ...(defaultWifiPassword ? { defaultWifiPassword } : {}),
  });

  let saved;
  try {
    saved = await adminRepo.save(newAdmin);
  } catch (dbError) {
    console.error(
      "Ошибка при сохранении в БД:",
      dbError instanceof Error ? dbError.message : String(dbError)
    );
    return res.status(400).json({
      message: "Ошибка при сохранении в БД",
      error: dbError instanceof Error ? dbError.message : String(dbError),
    });
  }

  res.status(201).json({
    message: `Admin "${saved.username}" created successfully`,
    adminId: saved.id,
    policy: {
      checkInHour: saved.checkInHour,
      checkOutHour: saved.checkOutHour,
    },
  });
};

/**
 * 🔐 GET /auth/users
 * - superadmin: returns only hotel admins + nested editors
 * - admin: returns only their editors
 * - editor: forbidden
 */
export const getUsers = async (req: AuthRequest, res: Response) => {
  const adminRepo = AppDataSource.getRepository(Admin);
  const { adminId, role } = req.user!;

  // редактор не має доступу
  if (role === ROLES.EDITOR) {
    return res.status(403).json({ message: "Editors cannot access user list" });
  }

  // superadmin → тільки адміни (без editor), але з вкладеними editor’ами
  if (role === ROLES.SUPER) {
    const admins = await adminRepo.find({
      where: { role: ROLES.ADMIN },
      relations: ["createdEditorAdmins"],
      order: { username: "ASC" },
    });

    // Приберемо password і повернемо editors вкладено
    const data = admins.map((a) => ({
      id: a.id,
      username: a.username,
      role: a.role,
      hotel_name: a.hotel_name,
      // Детальная структура адреса
      street: a.street,
      buildingNumber: a.buildingNumber,
      apartmentNumber: a.apartmentNumber,
      country: a.country,
      province: a.province,
      postalCode: a.postalCode,
      latitude: a.latitude,
      longitude: a.longitude,
      full_name: a.full_name,
      // Телефон разделен на код и номер
      phoneCountryCode: a.phoneCountryCode,
      phoneNumber: a.phoneNumber,
      logo_url: a.logo_url,
      // Для обратной совместимости формируем phone из компонентов
      phone:
        a.phoneCountryCode && a.phoneNumber
          ? `${a.phoneCountryCode} ${a.phoneNumber}`
          : a.phoneCountryCode || null,
      email: a.email,
      isBlocked: a.isBlocked,
      checkInHour: a.checkInHour, // 👈 show hotel policy
      checkOutHour: a.checkOutHour, // 👈 show hotel policy
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      editorsCount: a.createdEditorAdmins?.length ?? 0,
      editors: (a.createdEditorAdmins || []).map((e) => ({
        id: e.id,
        username: e.username,
        role: e.role, // завжди "editor"
        full_name: e.full_name,
        // Для обратной совместимости формируем phone из компонентов
        phone:
          e.phoneCountryCode && e.phoneNumber
            ? `${e.phoneCountryCode} ${e.phoneNumber}`
            : e.phoneCountryCode || null,
        email: e.email,
        isBlocked: e.isBlocked,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
        // Нічого зайвого (без password, без createdBy)
      })),
    }));

    return res.json(data);
  }

  // admin → як і було: тільки свої редактори плоским списком (або хочеш — можу зробити з блоком self + editors)
  if (role === ROLES.ADMIN) {
    const editors = await adminRepo.find({
      where: { createdBy: { id: adminId }, role: ROLES.EDITOR },
      order: { username: "ASC" },
    });

    // Прибрати password
    const data = editors.map((e) => ({
      id: e.id,
      username: e.username,
      role: e.role, // "editor"
      full_name: e.full_name,
      // Для обратной совместимости формируем phone из компонентов
      phone:
        e.phoneCountryCode && e.phoneNumber
          ? `${e.phoneCountryCode} ${e.phoneNumber}`
          : e.phoneCountryCode || null,
      email: e.email,
      isBlocked: e.isBlocked,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    }));

    return res.json(data);
  }
};

/** Повертає ефективні години політики на рівні адміна: або значення з БД, або дефолти. */
function effectivePolicyFromAdmin(
  admin?: { checkInHour: number | null; checkOutHour: number | null } | null
): { checkInHour: number; checkOutHour: number } | undefined {
  if (!admin) return undefined;
  const DEFAULT_IN = 14;
  const DEFAULT_OUT = 10;

  const inHour = Number.isInteger(admin.checkInHour)
    ? (admin.checkInHour as number)
    : DEFAULT_IN;
  const outHour = Number.isInteger(admin.checkOutHour)
    ? (admin.checkOutHour as number)
    : DEFAULT_OUT;

  return { checkInHour: inHour, checkOutHour: outHour };
}

/**
 * 🔐 POST /auth/login — admin or editor login
 * Payload:
 *  - For editor: adminId = owner's id (createdBy.id)
 *  - For admin:  adminId = own id
 * The same payload shape is preserved for middleware/guards.
 */
export const loginAdmin = async (req: Request, res: Response) => {
  const { username, password } = req.body as LoginRequestDto;

  // 1) Шукаємо користувача
  const adminRepository = AppDataSource.getRepository(Admin);
  // ВАЖЛИВО: тягнемо createdBy, бо для editor потрібен власник готелю
  const admin = await adminRepository.findOne({
    where: { username },
    relations: ["createdBy"],
  });

  if (!admin) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  if (admin.role === ROLES.ADMIN && admin.isBlocked) {
    return res.status(403).json({ message: "Account is blocked" });
  }
  if (admin.role === ROLES.EDITOR && admin.createdBy?.isBlocked) {
    return res
      .status(403)
      .json({ message: "Admin is blocked — editor access denied" });
  }
  const isMatch = await bcrypt.compare(password, admin.password);
  if (!isMatch) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  // 👇 КЛЮЧЕВОЕ: для editor кладём adminId = id владельца отеля (createdBy.id)
  const ownerAdminId =
    admin.role === ROLES.EDITOR ? admin.createdBy!.id : admin.id;

  // ✅ Токен НЕ міняємо — payload залишається тим самим, щоб middleware/контролери працювали як зараз
  // adminId = id власника готелю (для editor — це його createdBy)
  const token = jwt.sign(
    {
      adminId: ownerAdminId, // используется контроллерами rooms/stays
      role: admin.role as Role, // 'superadmin' | 'admin' | 'editor'
      sub: admin.id, // фактический пользователь (кто залогинился)
    },
    JWT_SECRET,
    { expiresIn: "48h" }
  );
  // 🆕 Відповідь: віддаємо профіль для фронта
  const policyNumbers =
    admin.role === ROLES.ADMIN
      ? effectivePolicyFromAdmin(admin)
      : effectivePolicyFromAdmin(admin.createdBy ?? null);

  const payload: LoginResponseDto = {
    token,
    username: admin.username,
    role: admin.role as Role,
    adminId: ownerAdminId,
    hotelName:
      admin.role === ROLES.ADMIN
        ? admin.hotel_name ?? undefined
        : admin.createdBy?.hotel_name ?? undefined,
    ...(policyNumbers ? { policy: policyNumbers } : {}),
  };
  return res.json({ payload });
};

/**
 * 🔐 POST /auth/create-editor — only admin can create editors
 * Copies hotel profile (including policy hours) from owner admin.
 */
export const createEditorAdmin = async (req: AuthRequest, res: Response) => {
  const {
    username,
    password,
    confirmPassword,
    full_name,
    phoneCountryCode,
    phoneNumber,
    phone, // Для обратной совместимости
    email,
  } = req.body as {
    username: string;
    password: string;
    confirmPassword: string;
    full_name?: string;
    phoneCountryCode?: string | null;
    phoneNumber?: string | null;
    phone?: string; // Для обратной совместимости
    email?: string;
  };
  const creatorId = req.user!.adminId;

  // только admin может создавать редакторов
  if (req.user!.role !== "admin") {
    return res.status(403).json({ message: "Only admin can create editors" });
  }

  if (!username || !password || !confirmPassword) {
    return res
      .status(400)
      .json({ message: "username, password and confirmPassword are required" });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match" });
  }

  const adminRepo = AppDataSource.getRepository(Admin);

  // 🔹 Получаем данные админа, который создаёт editor
  const creatorAdmin = await adminRepo.findOneBy({ id: creatorId });

  if (!creatorAdmin) {
    return res.status(404).json({ message: "Creator admin not found" });
  }
  const existing = await adminRepo.findOneBy({ username });

  if (existing) {
    return res.status(400).json({ message: "Username already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  // Используем helper для копирования данных отеля
  // Copy hotel profile + policy hours from owner
  const hotelData = copyHotelDataFromAdmin(creatorAdmin);

  // Обработка телефона: приоритет у новых полей phoneCountryCode/phoneNumber
  let finalPhoneCountryCode = phoneCountryCode ?? null;
  let finalPhoneNumber = phoneNumber ?? null;

  // Если указан старый формат phone, пытаемся распарсить
  if (phone && !finalPhoneCountryCode && !finalPhoneNumber) {
    const phoneMatch = phone.match(/^(\+\d{1,3})(.*)$/);
    if (phoneMatch) {
      finalPhoneCountryCode = phoneMatch[1];
      finalPhoneNumber = phoneMatch[2].replace(/[^\d]/g, "");
    } else {
      finalPhoneNumber = phone.replace(/[^\d]/g, "");
    }
  }

  // Если телефон не указан, копируем из данных отеля (hotelData уже содержит phoneCountryCode и phoneNumber)
  if (
    !finalPhoneCountryCode &&
    !finalPhoneNumber &&
    hotelData.phoneCountryCode
  ) {
    finalPhoneCountryCode = hotelData.phoneCountryCode ?? null;
    finalPhoneNumber = hotelData.phoneNumber ?? null;
  }

  // Создаём нового редактора с данными отеля и создателя
  const newEditor = adminRepo.create({
    username,
    password: hashedPassword,
    role: ROLES.EDITOR,
    createdBy: creatorAdmin,
    full_name,
    phoneCountryCode: finalPhoneCountryCode,
    phoneNumber: finalPhoneNumber,
    email,
    ...hotelData,
  });

  const saved = await adminRepo.save(newEditor);

  // 👇 ВАЖНО: adminId = creatorId (власник готелю), sub = id редактора
  const token = jwt.sign(
    { adminId: creatorId, role: saved.role, sub: saved.id },
    JWT_SECRET,
    { expiresIn: "48h" }
  );

  res.status(201).json({
    message: `Editor "${saved.username}" created successfully`,
    token,
  });
};

/**
 * 🔒 PUT /auth/block/:username — block admin and all their editors
 */
export const blockAdmin = async (req: AuthRequest, res: Response) => {
  const username = req.params.username;
  const adminRepo = AppDataSource.getRepository(Admin);
  const target = await adminRepo.findOne({
    where: { username },
    relations: ["createdEditorAdmins"],
  });

  if (!target || target.role !== ROLES.ADMIN) {
    return res.status(404).json({ message: "Admin not found" });
  }

  target.isBlocked = true;
  // 👉 Автоматично блочимо всіх editor'ів, яких він створив
  for (const editor of target.createdEditorAdmins) {
    editor.isBlocked = true;
  }
  await adminRepo.save([target, ...target.createdEditorAdmins]);
  res.json({ message: `Admin ${username} and all editors blocked` });
};

/**
 * 🔓 PUT /auth/unblock/:username — unblock admin and all their editors
 */
export const unblockAdmin = async (req: AuthRequest, res: Response) => {
  const username = req.params.username;
  const adminRepo = AppDataSource.getRepository(Admin);
  const target = await adminRepo.findOne({
    where: { username },
    relations: ["createdEditorAdmins"],
  });

  if (!target || target.role !== ROLES.ADMIN) {
    return res.status(404).json({ message: "Admin not found" });
  }

  target.isBlocked = false;
  // 👉 Розблоковуємо всіх editor'ів
  for (const editor of target.createdEditorAdmins) {
    editor.isBlocked = false;
  }

  await adminRepo.save([target, ...target.createdEditorAdmins]);

  res.json({ message: `Admin ${username} and all editors unblocked` });
};

/**
 * ❌ DELETE /auth/delete/:username
 * - superadmin can delete anyone
 * - admin can delete their editors (not themselves)
 * - editor cannot delete
 */
export const deleteAdminOrEditor = async (req: AuthRequest, res: Response) => {
  const requesterId = req.user!.sub; // actual logged-in user id
  const ownerId = req.user!.adminId; // hotel owner id
  const requesterRole = req.user!.role;
  const usernameToDelete = req.params.username;

  const adminRepo = AppDataSource.getRepository(Admin);
  const targetUser = await adminRepo.findOne({
    where: { username: usernameToDelete },
    relations: ["createdBy"],
  });

  if (!targetUser) {
    return res.status(404).json({ message: "User not found" });
  }

  if (requesterRole === ROLES.SUPER) {
    // superadmin може видалити будь-кого
    await adminRepo.remove(targetUser);
    return res.json({
      message: `User "${usernameToDelete}" deleted by superadmin`,
    });
  }

  if (requesterRole === ROLES.EDITOR) {
    return res.status(403).json({ message: "Editors cannot delete accounts" });
  }

  // admin не может удалить самого себя
  if (targetUser.id === requesterId) {
    return res.status(403).json({ message: "Admin cannot delete own account" });
  }

  // admin может удалить только своего editor'а
  const isCreatedByHim = targetUser.createdBy?.id === ownerId;
  if (!isCreatedByHim) {
    return res.status(403).json({ message: "Access denied" });
  }

  await adminRepo.remove(targetUser);
  res.json({ message: `User "${usernameToDelete}" deleted successfully` });
};

// 🔧 UPDATE: супер-адмін може редагувати профіль адміна-«власника» (готель)
// PUT /auth/admin/:username
// Body: будь-який із полів (не всі обовʼязкові)
// - hotel_name, address, full_name, phone, email, logo_url
// - checkInHour?: 0..23 | null  (null = "reset to follow defaults")
// - checkOutHour?: 0..23 | null

// 🔧 UPDATE: супер-адмін може редагувати профіль адміна-«власника» (готель)
// PUT /auth/admin/:username
// Body: будь-який із полів (не всі обовʼязкові)
// - hotel_name, address, full_name, phone, email, logo_url
// - checkInHour?: 0..23 | null  (null = "reset to follow defaults")
// - checkOutHour?: 0..23 | null
import { isHourOrNull } from "../utils/hours";

export const updateAdminHotelProfile = async (
  req: AuthRequest,
  res: Response
) => {
  // Додатковий захист: тільки супер-адмін
  if (!req.user || req.user.role !== ROLES.SUPER) {
    return res.status(403).json({ message: "Superadmin only" });
  }

  const username = req.params.username;

  // Строгий тип баду (усі поля опційні)
  const {
    hotel_name,
    // Детальная структура адреса
    street,
    buildingNumber,
    apartmentNumber,
    country,
    province,
    postalCode,
    latitude,
    longitude,
    full_name,
    // Телефон разделен на код и номер
    phoneCountryCode,
    phoneNumber,
    phone, // Для обратной совместимости
    email,
    logo_url,
    checkInHour,
    checkOutHour,
  }: {
    hotel_name?: string;
    street?: string | null;
    buildingNumber?: string | null;
    apartmentNumber?: string | null;
    country?: string | null;
    province?: string | null;
    postalCode?: string | null;
    latitude?: string | number | null;
    longitude?: string | number | null;
    full_name?: string | null;
    phoneCountryCode?: string | null;
    phoneNumber?: string | null;
    phone?: string | null; // Для обратной совместимости
    email?: string | null;
    logo_url?: string | null;
    checkInHour?: number | null;
    checkOutHour?: number | null;
  } = req.body;

  // Валідовуємо години, якщо прийшли
  if (typeof checkInHour !== "undefined" && !isHourOrNull(checkInHour)) {
    return res
      .status(400)
      .json({ message: "checkInHour must be 0..23 or null" });
  }
  if (typeof checkOutHour !== "undefined" && !isHourOrNull(checkOutHour)) {
    return res
      .status(400)
      .json({ message: "checkOutHour must be 0..23 or null" });
  }

  const repo = AppDataSource.getRepository(Admin);
  const admin = await repo.findOne({ where: { username } });
  if (!admin || admin.role !== ROLES.ADMIN) {
    return res.status(404).json({ message: "Admin not found" });
  }

  // Акуратно оновлюємо тільки передані поля
  if (typeof hotel_name !== "undefined") admin.hotel_name = hotel_name;

  // Обновление детальной структуры адреса
  const streetNorm = normalizeNullableString(street);
  if (typeof streetNorm !== "undefined") admin.street = streetNorm;

  const buildingNumberNorm = normalizeNullableString(buildingNumber);
  if (typeof buildingNumberNorm !== "undefined")
    admin.buildingNumber = buildingNumberNorm;

  const apartmentNumberNorm = normalizeNullableString(apartmentNumber);
  if (typeof apartmentNumberNorm !== "undefined")
    admin.apartmentNumber = apartmentNumberNorm;

  const countryNorm = normalizeNullableString(country);
  if (typeof countryNorm !== "undefined") admin.country = countryNorm;

  const provinceNorm = normalizeNullableString(province);
  if (typeof provinceNorm !== "undefined") admin.province = provinceNorm;

  const postalCodeNorm = normalizeNullableString(postalCode);
  if (typeof postalCodeNorm !== "undefined") admin.postalCode = postalCodeNorm;

  // Автоматически получаем координаты, если они не указаны, но адрес изменился
  let shouldGeocode = false;
  if (
    (typeof street !== "undefined" ||
      typeof buildingNumber !== "undefined" ||
      typeof province !== "undefined" ||
      typeof country !== "undefined") &&
    (!latitude || !longitude)
  ) {
    shouldGeocode = true;
  }

  // Координаты могут быть числом или строкой
  if (typeof latitude !== "undefined") {
    admin.latitude =
      latitude !== null && latitude !== undefined ? String(latitude) : null;
  }
  if (typeof longitude !== "undefined") {
    admin.longitude =
      longitude !== null && longitude !== undefined ? String(longitude) : null;
  }

  // Если координаты не указаны, но есть адрес - пытаемся получить их автоматически
  if (
    shouldGeocode &&
    admin.street &&
    (admin.buildingNumber || admin.province || admin.country)
  ) {
    const fullAddress = buildFullAddress({
      street: admin.street,
      buildingNumber: admin.buildingNumber,
      apartmentNumber: admin.apartmentNumber,
      province: admin.province,
      postalCode: admin.postalCode,
      country: admin.country,
    });

    try {
      const coords = await geocodeAddress(fullAddress);
      if (coords) {
        admin.latitude = coords.latitude;
        admin.longitude = coords.longitude;
        console.log(
          `✅ Координаты обновлены для адреса: ${fullAddress} -> ${coords.latitude}, ${coords.longitude}`
        );
      }
    } catch (error) {
      console.warn("⚠️ Не удалось получить координаты:", error);
    }
  }

  // Обработка телефона
  if (typeof phoneCountryCode !== "undefined") {
    admin.phoneCountryCode = normalizeNullableString(phoneCountryCode) ?? null;
  }
  if (typeof phoneNumber !== "undefined") {
    admin.phoneNumber = normalizeNullableString(phoneNumber) ?? null;
  }

  // Если указан старый формат phone и новые поля не указаны, пытаемся распарсить
  if (
    phone &&
    typeof phoneCountryCode === "undefined" &&
    typeof phoneNumber === "undefined"
  ) {
    const phoneMatch = phone.match(/^(\+\d{1,3})(.*)$/);
    if (phoneMatch) {
      admin.phoneCountryCode = phoneMatch[1];
      admin.phoneNumber = phoneMatch[2].replace(/[^\d]/g, "");
    } else {
      admin.phoneNumber = phone.replace(/[^\d]/g, "");
    }
  }

  const fullNameNorm = normalizeNullableString(full_name);
  if (typeof fullNameNorm !== "undefined") admin.full_name = fullNameNorm;

  const emailNorm = normalizeNullableString(email);
  if (typeof emailNorm !== "undefined") admin.email = emailNorm;

  // Если logo_url не указан или пустой, используем случайный логотип из вариантов
  const logoNorm = normalizeNullableString(logo_url);
  if (typeof logoNorm !== "undefined") {
    admin.logo_url = logoNorm || getRandomHotelLogo();
  }
  if (typeof checkInHour !== "undefined") admin.checkInHour = checkInHour;
  if (typeof checkOutHour !== "undefined") admin.checkOutHour = checkOutHour;

  const saved = await repo.save(admin);

  return res.json({
    message: `Admin "${saved.username}" updated`,
    admin: {
      id: saved.id,
      username: saved.username,
      hotel_name: saved.hotel_name,
      // Детальная структура адреса
      street: saved.street,
      buildingNumber: saved.buildingNumber,
      apartmentNumber: saved.apartmentNumber,
      country: saved.country,
      province: saved.province,
      postalCode: saved.postalCode,
      latitude: saved.latitude,
      longitude: saved.longitude,
      // Телефон разделен на код и номер
      phoneCountryCode: saved.phoneCountryCode,
      phoneNumber: saved.phoneNumber,
      // Для обратной совместимости формируем phone
      phone:
        saved.phoneCountryCode && saved.phoneNumber
          ? `${saved.phoneCountryCode} ${saved.phoneNumber}`
          : saved.phoneCountryCode || null,
      full_name: saved.full_name,
      email: saved.email,
      logo_url: saved.logo_url,
      checkInHour: saved.checkInHour,
      checkOutHour: saved.checkOutHour,
      updatedAt: saved.updatedAt,
    },
  });
};

function normalizeNullableString(v: unknown): string | null | undefined {
  if (typeof v === "undefined") return undefined;
  if (v === null) return null;
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}
