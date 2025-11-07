// src/controllers/stayController.ts
import { Response } from "express";
import { AppDataSource } from "../config/data-source";
import { Room } from "../entities/Room";
import { Stay } from "../entities/Stay";
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
    const adminId = req.user!.adminId;
    const stayRepo = AppDataSource.getRepository(Stay);

    const stays = await stayRepo
      .createQueryBuilder("s")
      .leftJoinAndSelect("s.room", "r")
      .where("r.adminId  = :adminId", { adminId })
      .andWhere("s.status IN (:...active)", { active: ["booked", "occupied"] })
      .orderBy("s.checkIn", "ASC")
      .getMany();

    return res.json(stays);
  } catch (error) {
    // Логуємо тільки якщо це не очікувана ситуація (порожня база - це нормально)
    if (error instanceof Error && !error.message.includes("empty")) {
      console.warn("Помилка при отриманні current stays:", error.message);
    }
    // Повертаємо порожній масив (той самий формат, що й при успіху)
    // Використовуємо 200 замість 500, бо порожня база - це нормальна ситуація
    return res.json([]);
  }
};

// Створення броні/заселення по кімнаті
// POST /rooms/number/:roomNumber/stays
export const createStayForRoom = async (req: AuthRequest, res: Response) => {
  const { roomNumber } = req.params;
  const { mainGuestName, extraGuestNames, checkIn, checkOut, balance, status } =
    req.body;

  const roomRepo = AppDataSource.getRepository(Room);
  const stayRepo = AppDataSource.getRepository(Stay);

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

  const stay = stayRepo.create({
    room,
    mainGuestName,
    extraGuestNames,
    checkIn,
    checkOut,
    balance: balance ?? 0,
    status: finalStatus,
    createdBy: username,
    updatedBy: username,
    updatedByRole: userRole,
  });

  await stayRepo.save(stay);

  const roomStatusFromStay: Record<Stay["status"], Room["status"]> = {
    booked: "booked",
    occupied: "occupied",
    completed: "free",
    cancelled: "free",
  };

  const nextRoomStatus = roomStatusFromStay[finalStatus];
  if (room.status !== nextRoomStatus) {
    room.status = nextRoomStatus;
    await roomRepo.save(room);
  }

  res.status(201).json({
    message: `Stay for room ${roomNumber} created successfully`,
    stay,
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
  if (extraGuestNames !== undefined) stay.extraGuestNames = extraGuestNames;
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
  const { roomNumber } = req.params;
  const { from, to } = req.query as { from?: string; to?: string };

  const qb = AppDataSource.getRepository(Stay)
    .createQueryBuilder("s")
    .leftJoinAndSelect("s.room", "r")
    .where("r.adminId = :adminId", { adminId: req.user!.adminId })
    .andWhere("r.roomNumber = :roomNumber", { roomNumber })
    .orderBy("s.checkIn", "DESC");

  if (from && to) {
    qb.andWhere("s.checkIn >= :from AND s.checkOut <= :to", { from, to });
  }

  const stays = await qb.getMany();
  res.json(stays);
};
