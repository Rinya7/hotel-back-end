import { Request, Response } from "express";
import { AppDataSource } from "../config/data-source";
import { Room } from "../entities/Room";
import { AuthRequest } from "../middlewares/authMiddleware";

// GET /rooms
export const getRooms = async (req: AuthRequest, res: Response) => {
  const adminId = req.user!.adminId;
  const roomRepo = AppDataSource.getRepository(Room);
  const rooms = await roomRepo.find({ where: { admin: { id: adminId } } });
  res.json(rooms);
};

// POST /rooms
export const createRoom = async (req: AuthRequest, res: Response) => {
  const adminId = req.user!.adminId;
  const {
    number,
    floor,
    capacity,
    wifiName,
    wifiPassword,
    qrBarUrl,
    mapPosition,
  } = req.body;

  const room = new Room();
  room.number = number;
  room.floor = floor;
  room.capacity = capacity;
  room.wifiName = wifiName;
  room.wifiPassword = wifiPassword;
  room.qrBarUrl = qrBarUrl;
  room.mapPosition = mapPosition;
  room.status = "free";
  room.admin = { id: adminId } as any;

  const saved = await AppDataSource.getRepository(Room).save(room);
  res.status(201).json(saved);
};

// PUT /rooms/:id
export const updateRoom = async (req: AuthRequest, res: Response) => {
  const adminId = req.user!.adminId;
  const roomId = parseInt(req.params.id);
  const roomRepo = AppDataSource.getRepository(Room);

  const room = await roomRepo.findOne({
    where: { id: roomId, admin: { id: adminId } },
  });
  if (!room) return res.status(404).json({ message: "Room not found" });

  Object.assign(room, req.body); // оновлюємо все, що приходить
  const updated = await roomRepo.save(room);
  res.json(updated);
};

// PUT /rooms/:id/status
export const updateRoomStatus = async (req: AuthRequest, res: Response) => {
  const adminId = req.user!.adminId;
  const roomId = parseInt(req.params.id);
  const { status } = req.body;

  const roomRepo = AppDataSource.getRepository(Room);
  const room = await roomRepo.findOne({
    where: { id: roomId, admin: { id: adminId } },
  });
  if (!room) return res.status(404).json({ message: "Room not found" });

  room.status = status;
  const updated = await roomRepo.save(room);
  res.json(updated);
};

// DELETE /rooms/:id
export const deleteRoom = async (req: AuthRequest, res: Response) => {
  const adminId = req.user!.adminId;
  const roomId = parseInt(req.params.id);

  const roomRepo = AppDataSource.getRepository(Room);
  const room = await roomRepo.findOne({
    where: { id: roomId, admin: { id: adminId } },
  });
  if (!room) return res.status(404).json({ message: "Room not found" });

  await roomRepo.remove(room);
  res.json({ message: "Room deleted" });
};
