// src/controllers/stayController.ts
import { Response } from "express";
import { AppDataSource } from "../config/data-source";
import { Room } from "../entities/Room";
import { Stay } from "../entities/Stay";
import { StayStatusLog } from "../entities/StayStatusLog";
import { Admin } from "../entities/Admin";
import { AuthRequest } from "../middlewares/authMiddleware";

// Отримати статистику по кімнатах поточного адміна
// GET /rooms/stats
export const getRoomStats = async (req: AuthRequest, res: Response) => {
  const adminId = req.user!.adminId;
  const roomRepo = AppDataSource.getRepository(Room);

  const counts = await roomRepo
    .createQueryBuilder("r")
    .select("r.status", "status")
    .addSelect("COUNT(*)", "count")
    .where("r.adminId  = :adminId", { adminId })
    .groupBy("r.status")
    .getRawMany<{ status: string; count: string }>();

  const stats = { free: 0, booked: 0, occupied: 0 };
  counts.forEach((c) => {
    stats[c.status as keyof typeof stats] = Number(c.count);
  });

  res.json(stats);
};

// Отримати всі активні заселення/броні поточного адміна
// GET /rooms/stays/current
// (для дашборда, всі активні Stay, які не completed/cancelled)
// (для адміна/editor)

export const getCurrentStays = async (req: AuthRequest, res: Response) => {
  try {
    // Додаткова перевірка для редакторів
    if (!req.user) {
      console.error("[getCurrentStays] No user in request");
      return res.status(401).json({ message: "No token provided" });
    }
    if (req.user.role !== "admin" && req.user.role !== "editor") {
      console.error("[getCurrentStays] Invalid role:", req.user.role);
      return res.status(403).json({ message: "Access denied" });
    }
    
    const { getOwnerAdminId } = await import("../utils/owner");
    const adminId = getOwnerAdminId(req);
    const stayRepo = AppDataSource.getRepository(Stay);

  const stays = await stayRepo
      .createQueryBuilder("s")
      .leftJoinAndSelect("s.room", "r")
    .leftJoinAndSelect("s.guests", "g")
      .where("r.adminId  = :adminId", { adminId })
      .andWhere("s.status IN (:...active)", { active: ["booked", "occupied"] })
      .orderBy("s.checkIn", "ASC")
      .getMany();

    return res.json(stays);
  } catch (error) {
    console.error("[getCurrentStays] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    // Якщо помилка з getOwnerAdminId - повертаємо 401/403
    if (errorMessage.includes("No auth user") || errorMessage.includes("Invalid adminId")) {
      return res.status(401).json({ 
        message: "Authentication error", 
        error: errorMessage 
      });
    }
    // Логуємо тільки якщо це не очікувана ситуація (порожня база - це нормально)
    if (errorMessage.includes("empty")) {
      return res.json([]);
    }
    // Повертаємо порожній масив (той самий формат, що й при успіху)
    return res.json([]);
  }
};

// Створення броні/заселення по кімнаті
// POST /rooms/number/:roomNumber/stays
export const createStayForRoom = async (req: AuthRequest, res: Response) => {
  const { roomNumber } = req.params;
  
  // Логируем что приходит в req.body для отладки
  console.log("[createStayForRoom] Received body:", JSON.stringify(req.body, null, 2));
  console.log("[createStayForRoom] firstName type:", typeof req.body?.firstName, "value:", req.body?.firstName);
  
  const {
    mainGuestName,
    firstName,
    lastName,
    email,
    phoneCountryCode,
    phoneNumber,
    guestsCount,
    extraGuestNames,
    checkIn,
    checkOut,
    balance,
    status,
  } = req.body;

  const roomRepo = AppDataSource.getRepository(Room);
  const stayRepo = AppDataSource.getRepository(Stay);
  const stayLogRepo = AppDataSource.getRepository(StayStatusLog);

  const room = await roomRepo.findOne({
    where: { roomNumber, admin: { id: req.user!.adminId } },
  });
  if (!room)
    return res.status(404).json({ message: `Room ${roomNumber} not found` });

  if (room.status === "cleaning") {
    return res
      .status(409)
      .json({ message: `Room ${roomNumber} is not available while cleaning` });
  }

  const validStatuses: Stay["status"][] = ["booked", "occupied"];
  const finalStatus: Stay["status"] = validStatuses.includes(status)
    ? status
    : "booked";

  const overlap = await stayRepo
    .createQueryBuilder("s")
    .leftJoin("s.room", "r")
    .where("r.id = :roomId", { roomId: room.id })
    .andWhere("s.status IN (:...active)", { active: ["booked", "occupied"] })
    .andWhere("s.checkIn < :checkOut AND s.checkOut > :checkIn", {
      checkIn,
      checkOut,
    })
    .getOne();

  if (overlap) {
    return res.status(409).json({
      message: `Room ${roomNumber} already booked/occupied for these dates`,
    });
  }

  // Отримуємо інформацію про користувача для встановлення createdBy
  const adminRepo = AppDataSource.getRepository(Admin);
  const user = req.user;
  let username: string = "guest";
  let userRole: "guest" | "admin" | "editor" = "guest";

  if (user) {
    const admin = await adminRepo.findOne({ where: { id: user.sub } });
    if (admin) {
      username = admin.username;
      if (user.role === "admin" || user.role === "editor") {
        userRole = user.role;
      }
    }
  }

  // Валидация обязательных полей (по аналогии с админом)
  if (!firstName || typeof firstName !== "string" || !firstName.trim()) {
    return res.status(400).json({ message: "firstName is required" });
  }
  if (!lastName || typeof lastName !== "string" || !lastName.trim()) {
    return res.status(400).json({ message: "lastName is required" });
  }
  if (!email || typeof email !== "string" || !email.trim()) {
    return res.status(400).json({ message: "email is required" });
  }
  if (!phoneCountryCode || typeof phoneCountryCode !== "string" || !phoneCountryCode.trim()) {
    return res.status(400).json({ message: "phoneCountryCode is required" });
  }
  if (!phoneNumber || typeof phoneNumber !== "string" || !phoneNumber.trim()) {
    return res.status(400).json({ message: "phoneNumber is required" });
  }
  if (!guestsCount || (typeof guestsCount !== "number" && typeof guestsCount !== "string") || Number(guestsCount) < 1) {
    return res.status(400).json({ message: "guestsCount is required and must be at least 1" });
  }

  const normalizedExtraGuests =
    Array.isArray(extraGuestNames) && extraGuestNames.length > 0
      ? extraGuestNames
      : [];

  // Нормализуем guestsCount: преобразуем в число (обязательное поле)
  const normalizedGuestsCount = Number(guestsCount);
  if (Number.isNaN(normalizedGuestsCount) || normalizedGuestsCount < 1) {
    return res.status(400).json({ message: "guestsCount must be a positive number" });
  }

  // Нормализуем обязательные поля (по аналогии с админом) - обрезаем пробелы
  // Эти поля уже проверены на валидность выше, поэтому они точно не пустые
  const normalizedFirstName = (firstName as string).trim();
  const normalizedLastName = (lastName as string).trim();
  const normalizedEmail = (email as string).trim();
  const normalizedPhoneCountryCode = (phoneCountryCode as string).trim();
  const normalizedPhoneNumber = (phoneNumber as string).trim();

  const stay = stayRepo.create({
    room,
    mainGuestName,
    firstName: normalizedFirstName,
    lastName: normalizedLastName,
    email: normalizedEmail,
    phoneCountryCode: normalizedPhoneCountryCode,
    phoneNumber: normalizedPhoneNumber,
    guestsCount: normalizedGuestsCount,
    extraGuestNames: normalizedExtraGuests,
    checkIn,
    checkOut,
    balance: balance ?? 0,
    status: finalStatus,
    createdBy: username,
    updatedBy: username,
    updatedByRole: userRole,
  });

  const saved = await stayRepo.save(stay);

  const creationLog = stayLogRepo.create({
    stay,
    oldStatus: finalStatus,
    newStatus: finalStatus,
    changedBy: username,
    changedByRole: userRole,
    comment: "created",
  });
  await stayLogRepo.save(creationLog);

  // Обновляем статус комнаты только для определенных статусов stay
  // Согласно логике: booked → статус комнаты не меняется (остается "free")
  // occupied → статус комнаты "occupied" (устанавливается при чекине)
  // completed → статус комнаты "cleaning" (устанавливается при чекауте)
  // cancelled → статус комнаты "free" (устанавливается при отмене)
  const roomStatusFromStay: Partial<Record<Stay["status"], Room["status"]>> = {
    occupied: "occupied",
    completed: "cleaning",
    cancelled: "free",
    // booked не меняет статус комнаты - он остается как был (обычно "free")
  };

  const nextRoomStatus = roomStatusFromStay[finalStatus];
  if (nextRoomStatus && room.status !== nextRoomStatus) {
    room.status = nextRoomStatus;
    await roomRepo.save(room);
  }

  res.status(201).json({
    message: `Stay for room ${roomNumber} created successfully`,
    stay: saved, // Возвращаем сохраненный stay с данными из БД
  });
};

//Редагувати бронь/заселення
// PUT /rooms/number/:roomNumber/stays?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD
// body: { mainGuestName, extraGuestNames, newCheckIn, newCheckOut
export const updateStayByDates = async (req: AuthRequest, res: Response) => {
  const { roomNumber } = req.params;
  const { checkIn, checkOut } = req.query as {
    checkIn?: string;
    checkOut?: string;
  };
  if (!checkIn || !checkOut) {
    return res
      .status(400)
      .json({ message: "checkIn and checkOut are required" });
  }

  const stayRepo = AppDataSource.getRepository(Stay);
  const stay = await stayRepo
    .createQueryBuilder("s")
    .leftJoinAndSelect("s.room", "r")
    .leftJoinAndSelect("s.guests", "g")
    .where("r.adminId = :adminId", { adminId: req.user!.adminId })
    .andWhere("r.roomNumber = :roomNumber", { roomNumber })
    .andWhere("s.checkIn = :checkIn AND s.checkOut = :checkOut", {
      checkIn,
      checkOut,
    })
    .getOne();

  if (!stay) return res.status(404).json({ message: "Stay not found" });

  const { mainGuestName, extraGuestNames, newCheckIn, newCheckOut, balance } =
    req.body;

  if (mainGuestName !== undefined) stay.mainGuestName = mainGuestName;
  if (Array.isArray(extraGuestNames)) {
    stay.extraGuestNames = extraGuestNames;
  } else if (extraGuestNames === null) {
    stay.extraGuestNames = [];
  }
  if (balance !== undefined) stay.balance = balance;

  if (newCheckIn || newCheckOut) {
    const nextIn = newCheckIn ?? stay.checkIn;
    const nextOut = newCheckOut ?? stay.checkOut;

    const conflict = await stayRepo
      .createQueryBuilder("s")
      .leftJoin("s.room", "r")
      .where("r.id = :roomId", { roomId: stay.room.id })
      .andWhere("s.id <> :id", { id: stay.id })
      .andWhere("s.status IN (:...active)", { active: ["booked", "occupied"] })
      .andWhere("s.checkIn < :nextOut AND s.checkOut > :nextIn", {
        nextIn,
        nextOut,
      })
      .getOne();

    if (conflict) {
      return res.status(409).json({
        message: `Room ${roomNumber} already booked/occupied for these dates`,
      });
    }

    stay.checkIn = nextIn;
    stay.checkOut = nextOut;
  }

  const saved = await stayRepo.save(stay);
  res.json({ message: `Stay updated`, stay: saved });
};

//Закрити бронь/заселення
// PUT /rooms/number/:roomNumber/stays/close?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD
// body: { status } (completed/cancelled)
export const closeStay = async (req: AuthRequest, res: Response) => {
  const { roomNumber } = req.params;
  const { checkIn, checkOut } = req.query as {
    checkIn?: string;
    checkOut?: string;
  };
  const { status } = req.body;
  if (!checkIn || !checkOut || !status) {
    return res
      .status(400)
      .json({ message: "checkIn, checkOut and status are required" });
  }
  if (!["completed", "cancelled"].includes(status)) {
    return res.status(400).json({ message: "Invalid status for closing stay" });
  }

  const stayRepo = AppDataSource.getRepository(Stay);
  const roomRepo = AppDataSource.getRepository(Room);

  const stay = await stayRepo
    .createQueryBuilder("s")
    .leftJoinAndSelect("s.room", "r")
    .where("r.adminId = :adminId", { adminId: req.user!.adminId })
    .andWhere("r.roomNumber = :roomNumber", { roomNumber })
    .andWhere("s.checkIn = :checkIn AND s.checkOut = :checkOut", {
      checkIn,
      checkOut,
    })
    .getOne();

  if (!stay) return res.status(404).json({ message: "Stay not found" });

  stay.status = status as Stay["status"];
  await stayRepo.save(stay);

  //   Якщо залишились активні заселення/броні в цій кімнаті, то статус не змінюємо
  // Якщо ж не залишилось, то статус кімнати free
  // (якщо статус Stay completed/cancelled, то статус кімнати free)
  const activeLeft = await stayRepo
    .createQueryBuilder("s")
    .leftJoin("s.room", "r")
    .where("r.id = :roomId", { roomId: stay.room.id })
    .andWhere("s.status IN (:...active)", { active: ["booked", "occupied"] })
    .getCount();

  if (activeLeft === 0) {
    stay.room.status = "free";
    await roomRepo.save(stay.room);
  }

  res.json({ message: `Stay for room ${roomNumber} closed as ${status}` });
};

//Історія по конкретній кімнаті
// GET /rooms/number/:roomNumber/stays
export const getStaysForRoom = async (req: AuthRequest, res: Response) => {
  try {
    // Додаткова перевірка для редакторів
    if (!req.user) {
      console.error("[getStaysForRoom] No user in request");
      return res.status(401).json({ message: "No token provided" });
    }
    if (req.user.role !== "admin" && req.user.role !== "editor") {
      console.error("[getStaysForRoom] Invalid role:", req.user.role);
      return res.status(403).json({ message: "Access denied" });
    }
    
    const { getOwnerAdminId } = await import("../utils/owner");
    const adminId = getOwnerAdminId(req);
    const { roomNumber } = req.params;
    const { from, to } = req.query as { from?: string; to?: string };

    const qb = AppDataSource.getRepository(Stay)
      .createQueryBuilder("s")
      .leftJoinAndSelect("s.room", "r")
      .where("r.adminId = :adminId", { adminId })
      .andWhere("r.roomNumber = :roomNumber", { roomNumber })
      .orderBy("s.checkIn", "DESC");

  if (from && to) {
    qb.andWhere("s.checkIn >= :from AND s.checkOut <= :to", { from, to });
  }

    const stays = await qb.leftJoinAndSelect("s.guests", "g").getMany();
    return res.json(stays);
  } catch (error) {
    console.error("[getStaysForRoom] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    // Якщо помилка з getOwnerAdminId - повертаємо 401/403
    if (errorMessage.includes("No auth user") || errorMessage.includes("Invalid adminId")) {
      return res.status(401).json({ 
        message: "Authentication error", 
        error: errorMessage 
      });
    }
    return res.status(500).json({ 
      message: "Помилка при отриманні проживань",
      error: errorMessage 
    });
  }
};
