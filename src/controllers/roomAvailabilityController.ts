//   src/controllers/roomAvailabilityController.ts
import { Response } from "express";
import { AppDataSource } from "../config/data-source";
import { Room } from "../entities/Room";
import { Stay } from "../entities/Stay";
import { AuthRequest } from "../middlewares/authMiddleware";

/** Спільний розрахунок доступності для всіх/обраних кімнат поточного адміна */
async function calcAvailability(
  adminId: number,
  from: string,
  to: string,
  opts?: { details?: boolean; roomNumbers?: string[] }
) {
  const details = opts?.details === true;
  const roomNumbers = opts?.roomNumbers;

  const roomRepo = AppDataSource.getRepository(Room);
  const stayRepo = AppDataSource.getRepository(Stay);

  // 1) Вибираємо кімнати поточного адміна (за потреби — фільтруємо по roomNumbers)
  const roomWhere: any = { admin: { id: adminId } };
  if (roomNumbers && roomNumbers.length > 0) {
    roomWhere.roomNumber =
      roomNumbers.length === 1 ? roomNumbers[0] : roomNumbers;
  }

  const rooms = await roomRepo.find({
    where: roomWhere,
    select: ["id", "roomNumber", "floor", "capacity", "status"],
    order: { roomNumber: "ASC" },
  });

  if (rooms.length === 0) return [];

  const roomIds = rooms.map((r) => r.id);

  // 2) Рахуємо конфлікти на діапазон дат по кожній кімнаті
  const rawCounts = await stayRepo
    .createQueryBuilder("s")
    .select("r.id", "roomId")
    .addSelect("COUNT(s.id)", "conflictsCount")
    .leftJoin("s.room", "r")
    .where("r.id IN (:...roomIds)", { roomIds })
    .andWhere("s.status IN (:...active)", { active: ["booked", "occupied"] })
    .andWhere("s.checkIn < :to AND s.checkOut > :from", { from, to })
    .groupBy("r.id")
    .getRawMany<{ roomId: string; conflictsCount: string }>();

  const conflictsMap = new Map<number, number>();
  for (const row of rawCounts) {
    conflictsMap.set(Number(row.roomId), Number(row.conflictsCount));
  }

  // 3) (опційно) деталі конфліктів
  let conflictsDetailsMap: Map<number, any[]> | undefined;
  if (details) {
    const conflicts = await stayRepo
      .createQueryBuilder("s")
      .leftJoinAndSelect("s.room", "r")
      .where("r.id IN (:...roomIds)", { roomIds })
      .andWhere("s.status IN (:...active)", { active: ["booked", "occupied"] })
      .andWhere("s.checkIn < :to AND s.checkOut > :from", { from, to })
      .orderBy("s.checkIn", "ASC")
      .getMany();

    conflictsDetailsMap = new Map<number, any[]>();
    for (const c of conflicts) {
      const arr = conflictsDetailsMap.get(c.room.id) ?? [];
      arr.push({
        id: c.id,
        status: c.status,
        mainGuestName: c.mainGuestName,
        checkIn: c.checkIn,
        checkOut: c.checkOut,
        balance: c.balance,
      });
      conflictsDetailsMap.set(c.room.id, arr);
    }
  }

  // 4) Формуємо відповідь
  const data = rooms.map((r) => {
    const conflictsCount = conflictsMap.get(r.id) ?? 0;
    const available = conflictsCount === 0 && r.status !== "cleaning";
    const base = {
      roomId: r.id,
      roomNumber: r.roomNumber,
      floor: r.floor,
      capacity: r.capacity,
      currentStatus: r.status,
      available,
      conflictsCount,
    };
    if (details && conflictsDetailsMap) {
      return { ...base, conflicts: conflictsDetailsMap.get(r.id) ?? [] };
    }
    return base;
  });

  return data;
}

/**
 * GET /rooms/availability?from=YYYY-MM-DD&to=YYYY-MM-DD[&details=1]
 * Масова доступність для всіх кімнат поточного адміна
 */
export const getAvailabilityForAllRooms = async (
  req: AuthRequest,
  res: Response
) => {
  const from = req.query.from as string;
  const to = req.query.to as string;
  const details = req.query.details === "1";

  if (!from || !to) {
    return res.status(400).json({
      message: "Query params 'from' and 'to' are required (YYYY-MM-DD)",
    });
  }

  const data = await calcAvailability(req.user!.adminId, from, to, { details });
  return res.json(data);
};

/**
 * GET /rooms/number/:roomNumber/availability?from=YYYY-MM-DD&to=YYYY-MM-DD[&details=1]
 * Доступність конкретної кімнати поточного адміна
 */
export const getRoomAvailability = async (req: AuthRequest, res: Response) => {
  const { roomNumber } = req.params;
  const from = req.query.from as string;
  const to = req.query.to as string;
  const details = req.query.details === "1";

  if (!from || !to) {
    return res.status(400).json({
      message: "Query params 'from' and 'to' are required (YYYY-MM-DD)",
    });
  }

  const data = await calcAvailability(req.user!.adminId, from, to, {
    details,
    roomNumbers: [roomNumber],
  });
  if (data.length === 0)
    return res.status(404).json({ message: "Room not found" });

  // повертаємо один об'єкт, а не масив
  return res.json(data[0]);
};
