// src/controllers/roomController.ts
import { Response } from "express";
import { AppDataSource } from "../config/data-source";
import { Room } from "../entities/Room";
import { Admin } from "../entities/Admin";
import { AuthRequest } from "../middlewares/authMiddleware";
import { isHourOrNull } from "../utils/hours";
import { getOwnerAdminId } from "../utils/owner";
import { ROLES } from "../auth/roles";

/** Narrow request body types (strict, no any) */
interface CreateRoomBody {
  roomNumber: string;
  floor: number;
  capacity: number;
  checkInHour?: number | null; // optional; null = follow hotel default
  checkOutHour?: number | null; // optional; null = follow hotel default
  wifiName?: string | null;
  wifiPassword?: string | null;
  qrBarUrl?: string | null;
  mapPosition?: string | null;
}

interface UpdateRoomBody {
  /** full edit; only the listed fields are allowed to change */
  roomNumber?: string;
  floor?: number;
  capacity?: number;
  checkInHour?: number | null;
  checkOutHour?: number | null;
  wifiName?: string | null;
  wifiPassword?: string | null;
  qrBarUrl?: string | null;
  mapPosition?: string | null;
}

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
  const statusParam = String(req.params.status) as
    | "free"
    | "booked"
    | "occupied";

  if (!["free", "booked", "occupied"].includes(statusParam)) {
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
export const updateRoomStatus = async (req: AuthRequest, res: Response) => {
  const ownerAdminId = getOwnerAdminId(req);
  const roomNumber = req.params.roomNumber;
  const { status } = req.body as { status: "free" | "booked" | "occupied" };

  const validStatuses: Array<"free" | "booked" | "occupied"> = [
    "free",
    "booked",
    "occupied",
  ];
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
