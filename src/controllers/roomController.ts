// src/controllers/roomController.ts
import { Response } from "express";
import { AppDataSource } from "../config/data-source";
import { Room } from "../entities/Room";
import { Admin } from "../entities/Admin";
import { RoomStatusLog } from "../entities/RoomStatusLog";
import { RoomCleaningLog } from "../entities/RoomCleaningLog";
import { AuthRequest } from "../middlewares/authMiddleware";
import { isHourOrNull } from "../utils/hours";
import { getOwnerAdminId } from "../utils/owner";
import { ROLES } from "../auth/roles";
import { updateRoomStatus } from "./stayOps.controller";
import { CreateRoomBody, UpdateRoomBody } from "../types/room";
import { RoomStatus } from "../types/ops";
import { Stay } from "../entities/Stay";

//type RoomStatus = "free" | "occupied" | "cleaning";

///** Narrow request body types (strict, no any) */
//interface CreateRoomBody {
//  roomNumber: string;
//  floor: number;
//  capacity: number;
//  checkInHour?: number | null; // optional; null = follow hotel default
//  checkOutHour?: number | null; // optional; null = follow hotel default
//  wifiName?: string | null;
//  wifiPassword?: string | null;
//  qrBarUrl?: string | null;
//  mapPosition?: string | null;
//}

//interface UpdateRoomBody {
//  /** full edit; only the listed fields are allowed to change */
//  roomNumber?: string;
//  floor?: number;
//  capacity?: number;
//  checkInHour?: number | null;
//  checkOutHour?: number | null;
//  wifiName?: string | null;
//  wifiPassword?: string | null;
//  qrBarUrl?: string | null;
//  mapPosition?: string | null;
//}

/** Helper: validate integer >= 0 */
function isNonNegativeInt(v: unknown): v is number {
  return Number.isInteger(v) && (v as number) >= 0;
}

/** Helper: coerce optional string-ish fields to null when empty */
function normalizeNullableString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function resolveRoomActor(
  req: AuthRequest
): Promise<{ username: string; role: "admin" | "editor" | "system" }> {
  const user = req.user;
  if (!user || (user.role !== "admin" && user.role !== "editor")) {
    return { username: "system", role: "system" };
  }

  const adminRepo = AppDataSource.getRepository(Admin);
  const admin = await adminRepo.findOne({ where: { id: user.sub } });
  return {
    username: admin?.username ?? "system",
    role: user.role,
  };
}

/** GET /rooms/all — superadmin only */
export const getAllRooms = async (req: AuthRequest, res: Response) => {
  // Security: enforce role here even if a route-level guard is present.
  if (!req.user || req.user.role !== ROLES.SUPER) {
    return res.status(403).json({ message: "Superadmin only" });
  }

  const roomRepo = AppDataSource.getRepository(Room);
  const rooms = await roomRepo.find({
    relations: ["admin"],
    order: { roomNumber: "ASC" },
  });

  return res.json(rooms);
};

/** GET /rooms — all rooms for current hotel (admin/editor) */
export const getRooms = async (req: AuthRequest, res: Response) => {
  const ownerAdminId = getOwnerAdminId(req);
  const roomRepo = AppDataSource.getRepository(Room);

  const rooms = await roomRepo.find({
    where: { admin: { id: ownerAdminId } },
    order: { roomNumber: "ASC" },
  });

  // ⚠️ ВАЖЛИВО: Видалено автоматичне виправлення статусів кімнат.
  // Раніше тут була логіка, яка автоматично змінювала room.status на "occupied",
  // якщо знаходила occupied stay. Це порушувало ручну модель статусів.
  //
  // Тепер статуси кімнат змінюються ТІЛЬКИ вручну через:
  //   - check-in endpoint (room.status = "occupied")
  //   - check-out endpoint (room.status = "cleaning")
  //   - markRoomCleaned endpoint (room.status = "free")
  //   - changeRoomStatusManual endpoint (ручна зміна статусу)
  //
  // Якщо статус кімнати не відповідає реальності - це потрібно виправити вручну
  // через відповідні endpoints, а не автоматично при GET запиті.

  return res.json(rooms);
};

/**
 * POST /rooms — create a new room
 * Behavior for policy hours:
 *  - if checkInHour/checkOutHour are provided:
 *      * number 0..23 → set as override
 *      * null         → explicit "follow hotel defaults"
 *  - if omitted → copy current owner's defaults (freeze at creation time)
 *
 * If you prefer "omit → null (always follow admin)", change the two lines marked with // <strategy>.
 */
export const createRoom = async (req: AuthRequest, res: Response) => {
  const ownerAdminId = getOwnerAdminId(req);
  const {
    roomNumber,
    floor,
    capacity,
    checkInHour,
    checkOutHour,
    wifiName,
    wifiPassword,
    qrBarUrl,
    mapPosition,
  } = req.body as CreateRoomBody;

  // --- Basic validation ---
  if (typeof roomNumber !== "string" || roomNumber.trim().length === 0) {
    return res.status(400).json({ message: "roomNumber is required" });
  }
  if (!isNonNegativeInt(floor) || !isNonNegativeInt(capacity)) {
    return res
      .status(400)
      .json({ message: "floor and capacity must be non-negative integers" });
  }
  if (typeof checkInHour !== "undefined" && !isHourOrNull(checkInHour)) {
    return res
      .status(400)
      .json({ message: "checkInHour must be integer 0..23 or null" });
  }
  if (typeof checkOutHour !== "undefined" && !isHourOrNull(checkOutHour)) {
    return res
      .status(400)
      .json({ message: "checkOutHour must be integer 0..23 or null" });
  }

  const adminRepo = AppDataSource.getRepository(Admin);
  const roomRepo = AppDataSource.getRepository(Room);

  // Load owner admin (strict typing, no casts)
  const owner = await adminRepo.findOneBy({ id: ownerAdminId });
  if (!owner) {
    return res.status(404).json({ message: "Owner admin not found" });
  }

  // Enforce roomNumber uniqueness within hotel early (optional: DB has a UNIQUE too)
  const existing = await roomRepo.findOne({
    where: { roomNumber, admin: { id: ownerAdminId } },
  });
  if (existing) {
    return res
      .status(409)
      .json({ message: `Room ${roomNumber} already exists in this hotel` });
  }

  const room = new Room();
  room.admin = owner;
  room.roomNumber = roomNumber.trim();
  room.floor = floor;
  room.capacity = capacity;
  room.status = "free";

  // --- Wi-Fi strategy: if provided → use; if omitted → copy from owner defaults ---
  room.wifiName =
    typeof wifiName !== "undefined"
      ? normalizeNullableString(wifiName)
      : owner.defaultWifiName;
  room.wifiPassword =
    typeof wifiPassword !== "undefined"
      ? normalizeNullableString(wifiPassword)
      : owner.defaultWifiPassword;

  room.qrBarUrl = normalizeNullableString(qrBarUrl);
  room.mapPosition = normalizeNullableString(mapPosition);

  // --- Policy hours strategy ---
  // Per-field behavior: if provided → respect; if omitted → copy from owner now. // <strategy>
  room.checkInHour =
    typeof checkInHour !== "undefined" ? checkInHour : owner.checkInHour;
  room.checkOutHour =
    typeof checkOutHour !== "undefined" ? checkOutHour : owner.checkOutHour;

  const saved = await roomRepo.save(room);

  return res.status(201).json({
    message: `Room ${saved.roomNumber} created successfully`,
    room: {
      id: saved.id,
      roomNumber: saved.roomNumber,
      floor: saved.floor,
      capacity: saved.capacity,
      status: saved.status,
      checkInHour: saved.checkInHour,
      checkOutHour: saved.checkOutHour,
    },
  });
};

/** GET /rooms/status/:status — list rooms by current Room.status */
export const getRoomsByStatus = async (req: AuthRequest, res: Response) => {
  const ownerAdminId = getOwnerAdminId(req);
  const statusParam = String(req.params.status) as RoomStatus;

  if (!["free", "occupied", "cleaning"].includes(statusParam)) {
    return res.status(400).json({ message: "Invalid status value" });
  }

  const rooms = await AppDataSource.getRepository(Room).find({
    where: { admin: { id: ownerAdminId }, status: statusParam },
    order: { roomNumber: "ASC" },
  });

  // Minimal shape for list
  const items = rooms.map((r) => ({
    id: r.id,
    roomNumber: r.roomNumber,
    floor: r.floor,
    capacity: r.capacity,
    status: r.status,
    // hours shown to operator if needed
    checkInHour: r.checkInHour,
    checkOutHour: r.checkOutHour,
  }));

  return res.json({ count: items.length, items });
};

/**
 * PUT /number/:roomNumber — full edit for a room
 * Only allows whitelisted fields to change; validates policy hours.
 */
export const updateRoom = async (req: AuthRequest, res: Response) => {
  const ownerAdminId = getOwnerAdminId(req);
  const roomNumberParam = req.params.roomNumber;

  const roomRepo = AppDataSource.getRepository(Room);
  const room = await roomRepo.findOne({
    where: { roomNumber: roomNumberParam, admin: { id: ownerAdminId } },
  });

  if (!room) {
    return res
      .status(404)
      .json({ message: `Room ${roomNumberParam} not found` });
  }

  const {
    roomNumber,
    floor,
    capacity,
    checkInHour,
    checkOutHour,
    wifiName,
    wifiPassword,
    qrBarUrl,
    mapPosition,
  } = req.body as UpdateRoomBody;

  // --- Validate inputs if present ---
  if (typeof roomNumber !== "undefined") {
    if (typeof roomNumber !== "string" || roomNumber.trim().length === 0) {
      return res
        .status(400)
        .json({ message: "roomNumber must be non-empty string" });
    }
    // Optional uniqueness check (DB has UNIQUE(admin, roomNumber) too)
    if (roomNumber.trim() !== room.roomNumber) {
      const dup = await roomRepo.findOne({
        where: { roomNumber: roomNumber.trim(), admin: { id: ownerAdminId } },
      });
      if (dup) {
        return res
          .status(409)
          .json({ message: `Room ${roomNumber} already exists in this hotel` });
      }
    }
  }
  if (typeof floor !== "undefined" && !isNonNegativeInt(floor)) {
    return res
      .status(400)
      .json({ message: "floor must be a non-negative integer" });
  }
  if (typeof capacity !== "undefined" && !isNonNegativeInt(capacity)) {
    return res
      .status(400)
      .json({ message: "capacity must be a non-negative integer" });
  }
  if (typeof checkInHour !== "undefined" && !isHourOrNull(checkInHour)) {
    return res
      .status(400)
      .json({ message: "checkInHour must be integer 0..23 or null" });
  }
  if (typeof checkOutHour !== "undefined" && !isHourOrNull(checkOutHour)) {
    return res
      .status(400)
      .json({ message: "checkOutHour must be integer 0..23 or null" });
  }

  // --- Apply changes (only allowed fields) ---
  if (typeof roomNumber !== "undefined") room.roomNumber = roomNumber.trim();
  if (typeof floor !== "undefined") room.floor = floor;
  if (typeof capacity !== "undefined") room.capacity = capacity;
  if (typeof checkInHour !== "undefined") room.checkInHour = checkInHour;
  if (typeof checkOutHour !== "undefined") room.checkOutHour = checkOutHour;
  if (typeof wifiName !== "undefined")
    room.wifiName = normalizeNullableString(wifiName);
  if (typeof wifiPassword !== "undefined")
    room.wifiPassword = normalizeNullableString(wifiPassword);
  if (typeof qrBarUrl !== "undefined")
    room.qrBarUrl = normalizeNullableString(qrBarUrl);
  if (typeof mapPosition !== "undefined")
    room.mapPosition = normalizeNullableString(mapPosition);

  const updated = await roomRepo.save(room);

  return res.json({
    message: `Room ${roomNumberParam} updated successfully`,
    room: {
      id: updated.id,
      roomNumber: updated.roomNumber,
      floor: updated.floor,
      capacity: updated.capacity,
      status: updated.status,
      checkInHour: updated.checkInHour,
      checkOutHour: updated.checkOutHour,
      wifiName: updated.wifiName,
      wifiPassword: updated.wifiPassword,
      qrBarUrl: updated.qrBarUrl,
      mapPosition: updated.mapPosition,
    },
  });
};

/**
 * PUT /number/:roomNumber/status — manually set room status
 * NOTE: This may be overridden later by the cron if inconsistent with stays.
 */
export const changeRoomStatusManual = async (
  req: AuthRequest,
  res: Response
) => {
  const ownerAdminId = getOwnerAdminId(req);
  const roomNumber = req.params.roomNumber;
  const { status } = req.body as { status: RoomStatus };

  const validStatuses: RoomStatus[] = ["free", "occupied", "cleaning"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid status value" });
  }

  const roomRepo = AppDataSource.getRepository(Room);
  const room = await roomRepo.findOne({
    where: { roomNumber, admin: { id: ownerAdminId } },
  });

  if (!room) {
    return res.status(404).json({ message: `Room ${roomNumber} not found` });
  }

  room.status = status;
  const updated = await roomRepo.save(room);

  return res.json({
    message: `Room ${roomNumber} status updated to '${status}'`,
    room: {
      id: updated.id,
      roomNumber: updated.roomNumber,
      status: updated.status,
    },
  });
};

/** DELETE /number/:roomNumber — delete room */
export const deleteRoom = async (req: AuthRequest, res: Response) => {
  const ownerAdminId = getOwnerAdminId(req);
  const roomNumber = req.params.roomNumber;

  const roomRepo = AppDataSource.getRepository(Room);
  const room = await roomRepo.findOne({
    where: { roomNumber, admin: { id: ownerAdminId } },
  });

  if (!room) {
    return res.status(404).json({ message: `Room ${roomNumber} not found` });
  }

  await roomRepo.remove(room);

  return res.json({
    message: `Room ${roomNumber} deleted successfully`,
    roomNumber,
  });
};

/** GET /rooms/number/:roomNumber/history — історія змін статусів кімнати */
export const getRoomHistory = async (req: AuthRequest, res: Response) => {
  try {
    // Додаткова перевірка для редакторів
    if (!req.user) {
      console.error("[getRoomHistory] No user in request");
      return res.status(401).json({ message: "No token provided" });
    }
    if (req.user.role !== "admin" && req.user.role !== "editor") {
      console.error("[getRoomHistory] Invalid role:", req.user.role);
      return res.status(403).json({ message: "Access denied" });
    }
    
    const ownerAdminId = getOwnerAdminId(req);
    const { roomNumber } = req.params;

    const roomRepo = AppDataSource.getRepository(Room);
    const room = await roomRepo.findOne({
      where: { roomNumber, admin: { id: ownerAdminId } },
      relations: ["statusLogs", "statusLogs.stay"],
    });

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // Сортуємо логи за датою (новіші спочатку)
    const sortedLogs = room.statusLogs.sort(
      (a, b) => b.changedAt.getTime() - a.changedAt.getTime()
    );

    // Форматуємо логи для відповіді з entityLabel та entityLink
    const logs = sortedLogs.map((log) => ({
      id: log.id,
      oldStatus: log.oldStatus,
      newStatus: log.newStatus,
      changedAt: log.changedAt,
      changedBy: log.changedBy,
      changedByRole: log.changedByRole,
      stay: log.stay
        ? {
            id: log.stay.id,
            mainGuestName: log.stay.mainGuestName,
          }
        : null,
      // Додаємо entityLabel та entityLink для пов'язаного проживання
      entityLabel: log.stay ? log.stay.mainGuestName : undefined,
      entityLink: log.stay ? `/stays/${log.stay.id}` : undefined,
      comment: log.comment || null,
      roomId: room.id,
    }));

    return res.json({
      roomId: room.id,
      roomNumber: room.roomNumber,
      logs,
    });
  } catch (error) {
    console.error("[getRoomHistory] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    // Якщо помилка з getOwnerAdminId - повертаємо 401/403
    if (errorMessage.includes("No auth user") || errorMessage.includes("Invalid adminId")) {
      return res.status(401).json({ 
        message: "Authentication error", 
        error: errorMessage 
      });
    }
    // Повертаємо порожній результат (той самий формат, що й при успіху)
    return res.json({
      roomId: 0,
      roomNumber: req.params.roomNumber,
      logs: [],
    });
  }
};

export const markRoomCleaned = async (req: AuthRequest, res: Response) => {
  const ownerAdminId = getOwnerAdminId(req);
  const roomId = Number(req.params.id);
  const { notes } = (req.body ?? {}) as { notes?: string | null };

  const roomRepo = AppDataSource.getRepository(Room);
  const room = await roomRepo.findOne({
    where: { id: roomId, admin: { id: ownerAdminId } },
    relations: ["stays"],
  });

  if (!room) {
    return res.status(404).json({ message: "Room not found" });
  }

  if (room.status !== "cleaning") {
    return res.status(400).json({ message: "Room is not in cleaning state" });
  }

  const actor = await resolveRoomActor(req);
  const trimmedNotes = notes?.toString().trim() ?? "";
  const cleanedAt = new Date();

  const previousStatus = room.status;
  room.status = "free";
  room.lastCleanedAt = cleanedAt;
  room.lastCleanedBy = actor.username;
  await roomRepo.save(room);

  const cleaningRepo = AppDataSource.getRepository(RoomCleaningLog);
  const cleaningLog = cleaningRepo.create({
    room,
    cleanedBy: actor.username,
    cleanedByRole: actor.role === "system" ? "system" : actor.role,
    notes: trimmedNotes.length > 0 ? trimmedNotes : null,
  });
  await cleaningRepo.save(cleaningLog);

  const roomStatusLogRepo = AppDataSource.getRepository(RoomStatusLog);
  const statusLog = roomStatusLogRepo.create({
    room,
    oldStatus: previousStatus,
    newStatus: room.status,
    changedBy: actor.username,
    changedByRole: actor.role,
    comment: trimmedNotes.length > 0 ? trimmedNotes : null,
  });
  await roomStatusLogRepo.save(statusLog);

  const roomUpdateActor: Parameters<typeof updateRoomStatus>[1] = {
    username: actor.username,
    stayRole: actor.role === "system" ? "guest" : actor.role,
    roomRole: actor.role,
  };

  const recalculatedRoom = await updateRoomStatus(room.id, roomUpdateActor, {
    comment: trimmedNotes.length > 0 ? trimmedNotes : null,
    skipWhenCleaning: false,
  });

  return res.json({
    message: "Room marked as cleaned",
    room: recalculatedRoom ?? room,
  });
};

export const getRoomStats = async (req: AuthRequest, res: Response) => {
  const ownerAdminId = getOwnerAdminId(req);
  const roomRepo = AppDataSource.getRepository(Room);

  const rawStats = await roomRepo
    .createQueryBuilder("room")
    .select("room.status", "status")
    .addSelect("COUNT(room.id)", "total")
    .where("room.adminId = :adminId", { adminId: ownerAdminId })
    .groupBy("room.status")
    .getRawMany<{ status: RoomStatus; total: string }>();

  const stats: Record<RoomStatus, number> = {
    free: 0,
    occupied: 0,
    cleaning: 0,
  };

  for (const row of rawStats) {
    const status = row.status;
    if (status in stats) {
      stats[status as RoomStatus] = Number(row.total) || 0;
    }
  }

  return res.json(stats);
};
