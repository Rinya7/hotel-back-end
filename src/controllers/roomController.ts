import { Response } from "express";
import { AppDataSource } from "../config/data-source";
import { Room } from "../entities/Room";
import { AuthRequest } from "../middlewares/authMiddleware";

//GET /rooms/all — тільки для superadmin
export const getAllRooms = async (req: AuthRequest, res: Response) => {
  const roomRepo = AppDataSource.getRepository(Room);
  const rooms = await roomRepo.find({
    relations: ["admin"],
    order: { roomNumber: "ASC" },
  });

  res.json(rooms);
};

// GET /rooms - всі кімнати поточного адміна/editor
export const getRooms = async (req: AuthRequest, res: Response) => {
  const adminId = req.user!.adminId;
  const roomRepo = AppDataSource.getRepository(Room);
  const rooms = await roomRepo.find({
    where: { admin: { id: adminId } },
    order: { roomNumber: "ASC" },
  });
  res.json(rooms);
};

// POST /rooms - створення нової кімнати
export const createRoom = async (req: AuthRequest, res: Response) => {
  const adminId = req.user!.adminId;
  const {
    roomNumber,
    floor,
    capacity,
    wifiName,
    wifiPassword,
    qrBarUrl,
    mapPosition,
  } = req.body;

  const room = new Room();
  room.roomNumber = roomNumber;
  room.floor = floor;
  room.capacity = capacity;
  room.wifiName = wifiName;
  room.wifiPassword = wifiPassword;
  room.qrBarUrl = qrBarUrl;
  room.mapPosition = mapPosition;
  room.status = "free";
  room.admin = { id: adminId } as any;

  const saved = await AppDataSource.getRepository(Room).save(room);
  res.status(201).json({
    message: `Room ${roomNumber} created successfully`,
    roomId: saved.id,
    number: saved.roomNumber,
    floor: saved.floor,
    capacity: saved.capacity,
    status: saved.status,
  });
};

// PUT /number/:roomNumber - повне редагування кімнати
export const updateRoom = async (req: AuthRequest, res: Response) => {
  const adminId = req.user!.adminId;
  const roomNumber = req.params.roomNumber;

  const roomRepo = AppDataSource.getRepository(Room);
  const room = await roomRepo.findOne({
    where: { roomNumber, admin: { id: adminId } },
  });

  if (!room) {
    return res.status(404).json({ message: `Room ${roomNumber} not found` });
  }

  Object.assign(room, req.body);
  const updated = await roomRepo.save(room);
  res.json({
    message: `Room ${roomNumber} updated successfully`,
    number: updated.roomNumber,
    floor: updated.floor,
    capacity: updated.capacity,
    status: updated.status,
  });
};

// PUT /number/:roomNumber/status - оновлення статусу кімнати
export const updateRoomStatus = async (req: AuthRequest, res: Response) => {
  const adminId = req.user!.adminId;
  const roomNumber = req.params.roomNumber;
  const { status } = req.body;
  const validStatuses = ["free", "booked", "occupied"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid status value" });
  }
  const roomRepo = AppDataSource.getRepository(Room);
  const room = await roomRepo.findOne({
    where: { roomNumber, admin: { id: adminId } },
  });

  if (!room) {
    return res.status(404).json({ message: `Room ${roomNumber} not found` });
  }

  room.status = status;
  const updated = await roomRepo.save(room);
  res.json({
    message: `Room ${roomNumber} status updated to '${status}'`,
    number: updated.roomNumber,
    status: updated.status,
  });
};

// DELETE /number/:roomNumber - видалення кімнати
export const deleteRoom = async (req: AuthRequest, res: Response) => {
  const adminId = req.user!.adminId;
  const roomNumber = req.params.roomNumber;

  const roomRepo = AppDataSource.getRepository(Room);
  const room = await roomRepo.findOne({
    where: { roomNumber, admin: { id: adminId } },
  });

  if (!room) {
    return res.status(404).json({ message: `Room ${roomNumber} not found` });
  }

  await roomRepo.remove(room);
  res.json({
    message: `Room ${roomNumber} deleted successfully`,
    number: roomNumber,
  });
};
