//| Метод                       | URL                  | Опис                             |
//| --------------------------- | -------------------- | -------------------------------- |
//| `POST /stays`               | створити новий запис | бронювання або заселення         |
//| `PUT /stays/:id/status`     | змінити статус       | наприклад, `booked` → `occupied` |
//| `GET /stays?roomNumber=...` | список по номеру     | показати історію по кімнаті      |

import { Response } from "express";
import { AppDataSource } from "../config/data-source";
import { Room } from "../entities/Room";
import { Stay } from "../entities/Stay";
import { AuthRequest } from "../middlewares/authMiddleware";

// GET /stays  — все проживання по отелю текущего admin/editor
export const getAllStaysForHotel = async (req: AuthRequest, res: Response) => {
  const stayRepo = AppDataSource.getRepository(Stay);
  const items = await stayRepo
    .createQueryBuilder("s")
    .leftJoinAndSelect("s.room", "r")
    .leftJoin("r.admin", "a")
    .where("a.id = :adminId", { adminId: req.user!.adminId })
    .orderBy("s.checkIn", "DESC")
    .getMany();
  res.json(items);
};

/**
 * POST /rooms/number/:roomNumber/stays
 * створити бронювання/заселення для КОНКРЕТНОЇ кімнати
 */
export const createStayForRoom = async (req: AuthRequest, res: Response) => {
  const { roomNumber } = req.params;
  const { mainGuestName, extraGuestNames, checkIn, checkOut, balance, status } =
    req.body;

  const roomRepo = AppDataSource.getRepository(Room);
  const stayRepo = AppDataSource.getRepository(Stay);

  // кімната поточного адміна
  const room = await roomRepo.findOne({
    where: { roomNumber, admin: { id: req.user!.adminId } },
  });
  if (!room)
    return res.status(404).json({ message: `Room ${roomNumber} not found` });

  // валідація статусу
  const validStatuses: Stay["status"][] = [
    "booked",
    "occupied",
    "completed",
    "cancelled",
  ];
  const finalStatus: Stay["status"] = validStatuses.includes(status)
    ? status
    : "booked";

  // заборона накладень активних проживань за датами
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

  const stay = stayRepo.create({
    room,
    mainGuestName,
    extraGuestNames,
    checkIn,
    checkOut,
    balance: balance ?? 0,
    status: finalStatus,
  });

  const saved = await stayRepo.save(stay);

  // синхронізуємо поточний статус кімнати
  if (finalStatus === "booked" || finalStatus === "occupied") {
    room.status = finalStatus === "booked" ? "booked" : "occupied";
    await roomRepo.save(room);
  }

  res.status(201).json({
    message: `Stay for room ${roomNumber} created successfully`,
    stayId: saved.id,
    roomNumber,
    mainGuestName,
    status: saved.status,
  });
};

/**
 * GET /rooms/number/:roomNumber/stays
 * історія проживань по кімнаті поточного адміна
 */
export const getStaysForRoom = async (req: AuthRequest, res: Response) => {
  const { roomNumber } = req.params;
  const stayRepo = AppDataSource.getRepository(Stay);

  const items = await stayRepo
    .createQueryBuilder("s")
    .leftJoinAndSelect("s.room", "r")
    .leftJoin("r.admin", "a")
    .where("a.id = :adminId", { adminId: req.user!.adminId })
    .andWhere("r.roomNumber = :roomNumber", { roomNumber })
    .orderBy("s.checkIn", "DESC")
    .getMany();

  res.json(items);
};

/**
 * PUT /stays/:id/status
 * оновити статус конкретного проживання
 */
export const updateStayStatus = async (req: AuthRequest, res: Response) => {
  const stayId = parseInt(req.params.id);
  const { status } = req.body; // "booked" | "occupied" | "completed" | "cancelled"

  const valid: Stay["status"][] = [
    "booked",
    "occupied",
    "completed",
    "cancelled",
  ];
  if (!valid.includes(status)) {
    return res.status(400).json({ message: "Invalid status value" });
  }

  const stayRepo = AppDataSource.getRepository(Stay);
  const roomRepo = AppDataSource.getRepository(Room);

  const stay = await stayRepo.findOne({
    where: { id: stayId },
    relations: ["room", "room.admin"],
  });
  if (!stay || stay.room.admin.id !== req.user!.adminId) {
    return res.status(404).json({ message: "Stay not found" });
  }

  stay.status = status;
  const saved = await stayRepo.save(stay);

  // оновлюємо статус кімнати
  if (status === "booked" || status === "occupied") {
    stay.room.status = status === "booked" ? "booked" : "occupied";
    await roomRepo.save(stay.room);
  }
  if (status === "completed" || status === "cancelled") {
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
  }

  res.json({
    message: `Stay for room ${stay.room.roomNumber} status updated to '${status}'`,
    stayId: saved.id,
    roomNumber: stay.room.roomNumber,
    status: saved.status,
  });
};
