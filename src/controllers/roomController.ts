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
  room.roomNumber = number;
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

// PUT /number/:roomNumber
export const updateRoom = async (req: AuthRequest, res: Response) => {
  const adminId = req.user!.adminId;
  const roomNumber = req.params.roomNumber;

  const roomRepo = AppDataSource.getRepository(Room);
  const room = await roomRepo.findOne({
    where: { roomNumber, admin: { id: adminId } },
  });

  if (!room) {
    return res.status(404).json({ message: "Room not found" });
  }

  Object.assign(room, req.body);
  const updated = await roomRepo.save(room);
  res.json(updated);
};

// PUT /number/:roomNumber/status
export const updateRoomStatus = async (req: AuthRequest, res: Response) => {
  const adminId = req.user!.adminId;
  const roomNumber = req.params.roomNumber;
  const { status } = req.body;

  const roomRepo = AppDataSource.getRepository(Room);
  const room = await roomRepo.findOne({
    where: { roomNumber, admin: { id: adminId } },
  });

  if (!room) {
    return res.status(404).json({ message: "Room not found" });
  }

  room.status = status;
  const updated = await roomRepo.save(room);
  res.json(updated);
};

// DELETE /number/:roomNumber
export const deleteRoom = async (req: AuthRequest, res: Response) => {
  const adminId = req.user!.adminId;
  const roomNumber = req.params.roomNumber;

  const roomRepo = AppDataSource.getRepository(Room);
  const room = await roomRepo.findOne({
    where: { roomNumber, admin: { id: adminId } },
  });

  if (!room) {
    return res.status(404).json({ message: "Room not found" });
  }

  await roomRepo.remove(room);
  res.json({ message: "Room deleted" });
};
