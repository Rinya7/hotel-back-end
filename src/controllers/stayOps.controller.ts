// src/controllers/stayOps.controller.ts
// Повна бізнес-логіка життєвого циклу проживань (Stay) та синхронізації з номерами (Room).

import { Response } from "express";
import { AppDataSource } from "../config/data-source";
import { AuthRequest } from "../middlewares/authMiddleware";
import { Stay } from "../entities/Stay";
import { Room } from "../entities/Room";
import { StayStatusLog } from "../entities/StayStatusLog";
import { RoomStatusLog } from "../entities/RoomStatusLog";
import { Admin } from "../entities/Admin";
import { getOwnerAdminId } from "../utils/owner";
import { StayGuest } from "../entities/StayGuest";

type StayStatus = "booked" | "occupied" | "completed" | "cancelled";
type RoomStatus = "free" | "occupied" | "cleaning";
type StayActorRole = "guest" | "admin" | "editor";
type RoomActorRole = "system" | "admin" | "editor";

interface ActorContext {
  username: string;
  stayRole: StayActorRole;
  roomRole: RoomActorRole;
}

interface StatusChangeResult {
  stay: Stay;
  room: Room;
}

const STAY_TO_ROOM_STATUS: Record<StayStatus, RoomStatus> = {
  booked: "free",
  occupied: "occupied",
  completed: "cleaning",
  cancelled: "free",
};

async function resolveActor(req: AuthRequest): Promise<ActorContext> {
  const defaultActor: ActorContext = {
    username: "guest",
    stayRole: "guest",
    roomRole: "system",
  };

  const user = req.user;
  if (!user) {
    return defaultActor;
  }

  if (user.role === "admin" || user.role === "editor") {
    const adminRepo = AppDataSource.getRepository(Admin);
    const admin = await adminRepo.findOne({ where: { id: user.sub } });
    const username = admin?.username ?? "system";
    return {
      username,
      stayRole: user.role,
      roomRole: user.role,
    };
  }

  return defaultActor;
}

async function loadStayWithRoom(
  stayId: number,
  ownerAdminId: number
): Promise<Stay | null> {
  return AppDataSource.getRepository(Stay).findOne({
    where: { id: stayId, room: { admin: { id: ownerAdminId } } },
    relations: ["room", "room.admin", "guests"],
  });
}

function isCheckoutToday(stay: Stay): boolean {
  const checkOutDate = new Date(stay.checkOut);
  const today = new Date();
  const checkOutIso = checkOutDate.toISOString().slice(0, 10);
  const todayIso = today.toISOString().slice(0, 10);
  return checkOutIso === todayIso;
}

async function persistStayStatusChange(
  stay: Stay,
  options: {
    nextStatus: StayStatus;
    actor: ActorContext;
    comment?: string | null;
    roomDirective?: RoomStatus | "auto" | "skip";
  }
): Promise<StatusChangeResult> {
  const { nextStatus, actor, comment, roomDirective = "auto" } = options;

  const stayRepo = AppDataSource.getRepository(Stay);
  const stayLogRepo = AppDataSource.getRepository(StayStatusLog);
  const roomRepo = AppDataSource.getRepository(Room);
  const roomLogRepo = AppDataSource.getRepository(RoomStatusLog);

  const previousStayStatus = stay.status;
  const trimmedComment = comment?.toString().trim() || null;

  if (previousStayStatus === nextStatus && roomDirective === "skip") {
    const refreshed = await stayRepo.findOne({
      where: { id: stay.id },
      relations: ["room", "statusLogs", "guests"],
    });
    if (!refreshed) {
      throw new Error("Stay disappeared during status change");
    }
    return { stay: refreshed, room: refreshed.room };
  }

  stay.status = nextStatus;
  stay.updatedBy = actor.username;
  stay.updatedByRole = actor.stayRole;
  await stayRepo.save(stay);

  const stayLog = stayLogRepo.create({
    stay,
    oldStatus: previousStayStatus,
    newStatus: nextStatus,
    changedBy: actor.username,
    changedByRole: actor.stayRole,
    comment: trimmedComment,
  });
  await stayLogRepo.save(stayLog);

  if (roomDirective !== "skip") {
    const targetRoomStatus =
      roomDirective === "auto" ? STAY_TO_ROOM_STATUS[nextStatus] : roomDirective;

    if (targetRoomStatus && stay.room.status !== targetRoomStatus) {
      const previousRoomStatus = stay.room.status;
      stay.room.status = targetRoomStatus;
      await roomRepo.save(stay.room);

      const roomLog = roomLogRepo.create({
        room: stay.room,
        stay,
        oldStatus: previousRoomStatus,
        newStatus: targetRoomStatus,
        changedBy: actor.username,
        changedByRole: actor.roomRole,
        comment: trimmedComment,
      });
      await roomLogRepo.save(roomLog);
    }
  }

  const refreshedStay = await stayRepo.findOne({
    where: { id: stay.id },
    relations: ["room", "statusLogs", "guests"],
  });

  if (!refreshedStay) {
    throw new Error("Stay not found after status change");
  }

  return { stay: refreshedStay, room: refreshedStay.room };
}

export async function updateRoomStatus(
  roomId: number,
  actor?: ActorContext,
  options?: { comment?: string | null; skipWhenCleaning?: boolean }
): Promise<Room | null> {
  const roomRepo = AppDataSource.getRepository(Room);
  const room = await roomRepo.findOne({
    where: { id: roomId },
    relations: ["stays"],
  });

  if (!room) {
    return null;
  }

  const skipWhenCleaning = options?.skipWhenCleaning !== false;
  // Если комната в статусе "cleaning", не пересчитываем статус (оставляем как есть)
  // Это важно, так как "cleaning" устанавливается вручную или при чекауте
  if (skipWhenCleaning && room.status === "cleaning") {
    return room;
  }

  const activeStays = room.stays.filter((s) =>
    ["booked", "occupied"].includes(s.status)
  );

  let nextStatus: RoomStatus = room.status;
  
  // Если есть occupied stay, комната должна быть "occupied"
  if (activeStays.some((s) => s.status === "occupied")) {
    nextStatus = "occupied";
  } else {
    // Если нет активных stays, комната должна быть "free"
    // НО только если она не в статусе "cleaning"
    // (статус "cleaning" устанавливается вручную при чекауте и не должен пересчитываться)
    if (room.status === "cleaning") {
      // Если комната в статусе "cleaning", оставляем как есть
      return room;
    }
    nextStatus = "free";
  }

  if (nextStatus === room.status) {
    return room;
  }

  const previousStatus = room.status;
  room.status = nextStatus;
  await roomRepo.save(room);

  const roomLogRepo = AppDataSource.getRepository(RoomStatusLog);
  const context: ActorContext = actor ?? {
    username: "system",
    stayRole: "guest",
    roomRole: "system",
  };

  const log = roomLogRepo.create({
    room,
    oldStatus: previousStatus,
    newStatus: nextStatus,
    changedBy: context.username,
    changedByRole: context.roomRole,
    comment: options?.comment ?? null,
  });
  await roomLogRepo.save(log);

  return room;
}

function sortStayLogs(stay: Stay): Stay {
  stay.statusLogs = [...stay.statusLogs].sort(
    (a, b) => b.changedAt.getTime() - a.changedAt.getTime()
  );
  return stay;
}

export const checkInStay = async (req: AuthRequest, res: Response) => {
  const ownerAdminId = getOwnerAdminId(req);
  const stayId = Number(req.params.id);
  const actor = await resolveActor(req);
  const { comment } = (req.body ?? {}) as { comment?: string };

  const stay = await loadStayWithRoom(stayId, ownerAdminId);
  if (!stay) {
    return res.status(404).json({ message: "Stay not found" });
  }

  if (stay.room.status === "occupied" || stay.room.status === "cleaning") {
    return res
      .status(400)
      .json({ message: "Room not available for check-in" });
  }

  const canCheckIn =
    stay.status === "booked" || stay.room.status === "free";
  if (!canCheckIn) {
    return res
      .status(400)
      .json({ message: "Room not available for check-in" });
  }

  const guestRepo = AppDataSource.getRepository(StayGuest);
  const stayRepo = AppDataSource.getRepository(Stay);

  const payload = (req.body ?? {}) as {
    comment?: string;
    guests?: Array<{
      firstName?: string;
      lastName?: string;
      email?: string | null;
      phoneCountryCode?: string | null;
      phoneNumber?: string | null;
      documentType?: string | null;
      documentNumber?: string | null;
      birthDate?: string | null;
      notes?: string | null;
      // Підтримка старого формату fullName та phone для сумісності
      fullName?: string;
      phone?: string | null;
    }>;
  };

  const trimmedComment = payload.comment?.toString().trim();
  const guestsPayload = Array.isArray(payload.guests)
    ? payload.guests
    : [];

  const normalizedGuests = guestsPayload
    .map((guest) => {
      // Підтримка старого формату: якщо є fullName, розділяємо його
      let firstName = guest.firstName?.toString().trim() ?? "";
      let lastName = guest.lastName?.toString().trim() ?? "";
      
      if ((!firstName || !lastName) && guest.fullName) {
        const fullNameParts = guest.fullName.toString().trim().split(/\s+/);
        if (fullNameParts.length > 0) {
          firstName = firstName || fullNameParts[0];
          lastName = lastName || fullNameParts.slice(1).join(" ") || fullNameParts[0];
        }
      }

      // Підтримка старого формату phone: якщо є phone, розділяємо його на код і номер
      let phoneCountryCode = guest.phoneCountryCode?.toString().trim() || null;
      let phoneNumber = guest.phoneNumber?.toString().trim() || null;
      
      if (!phoneCountryCode && !phoneNumber && guest.phone) {
        const phoneStr = guest.phone.toString().trim();
        const phoneMatch = phoneStr.match(/^(\+\d{1,4})\s*(.+)$/);
        if (phoneMatch) {
          phoneCountryCode = phoneMatch[1];
          phoneNumber = phoneMatch[2];
        } else {
          phoneNumber = phoneStr;
        }
      }

      return {
        firstName,
        lastName,
        email: guest.email?.toString().trim() || null,
        phoneCountryCode,
        phoneNumber,
        documentType: guest.documentType?.toString().trim() || null,
        documentNumber: guest.documentNumber?.toString().trim() || null,
        birthDate:
          guest.birthDate && !Number.isNaN(Date.parse(guest.birthDate))
            ? new Date(guest.birthDate)
            : null,
        notes: guest.notes?.toString().trim() || null,
      };
    })
    .filter((guest) => guest.firstName.length > 0 || guest.lastName.length > 0);

  if (normalizedGuests.length === 0) {
    return res.status(400).json({
      message: "Guest list is required for check-in",
    });
  }

  const capacity = typeof stay.room.capacity === "number" ? stay.room.capacity : null;
  if (capacity !== null && capacity > 0 && normalizedGuests.length > capacity) {
    return res.status(400).json({
      message: `Guest count exceeds room capacity (${capacity})`,
    });
  }

  await guestRepo.delete({ stay: { id: stay.id } });

  // Формуємо mainGuestName з firstName та lastName
  const mainGuest = normalizedGuests[0];
  stay.mainGuestName = `${mainGuest.firstName} ${mainGuest.lastName}`.trim() || mainGuest.firstName || mainGuest.lastName;
  stay.extraGuestNames = normalizedGuests
    .slice(1)
    .map((guest) => `${guest.firstName} ${guest.lastName}`.trim() || guest.firstName || guest.lastName);
  stay.guests = [];
  await stayRepo.save(stay);

  const guestEntities = normalizedGuests.map((guest) =>
    guestRepo.create({
      stay,
      firstName: guest.firstName,
      lastName: guest.lastName,
      email: guest.email,
      phoneCountryCode: guest.phoneCountryCode,
      phoneNumber: guest.phoneNumber,
      documentType: guest.documentType,
      documentNumber: guest.documentNumber,
      birthDate: guest.birthDate,
      notes: guest.notes,
    })
  );
  await guestRepo.save(guestEntities);
  stay.guests = guestEntities;

  const result = await persistStayStatusChange(stay, {
    nextStatus: "occupied",
    actor,
    comment: trimmedComment ?? null,
    roomDirective: "auto",
  });

  return res.json({
    message: "Stay checked in successfully",
    stay: sortStayLogs(result.stay),
    room: result.room,
  });
};

export const checkOutStay = async (req: AuthRequest, res: Response) => {
  const ownerAdminId = getOwnerAdminId(req);
  const stayId = Number(req.params.id);
  const actor = await resolveActor(req);
  const { comment } = (req.body ?? {}) as { comment?: string };

  const stay = await loadStayWithRoom(stayId, ownerAdminId);
  if (!stay) {
    return res.status(404).json({ message: "Stay not found" });
  }

  if (stay.status !== "occupied") {
    return res
      .status(400)
      .json({ message: "Stay must be occupied before check-out" });
  }

  const result = await persistStayStatusChange(stay, {
    nextStatus: "completed",
    actor,
    comment,
    roomDirective: "auto",
  });

  return res.json({
    message: "Stay checked out successfully",
    stay: sortStayLogs(result.stay),
    room: result.room,
  });
};

export const cancelStay = async (req: AuthRequest, res: Response) => {
  const ownerAdminId = getOwnerAdminId(req);
  const stayId = Number(req.params.id);
  const actor = await resolveActor(req);
  const { comment } = (req.body ?? {}) as { comment?: string };

  const stay = await loadStayWithRoom(stayId, ownerAdminId);
  if (!stay) {
    return res.status(404).json({ message: "Stay not found" });
  }

  if (stay.status !== "booked") {
    return res
      .status(400)
      .json({ message: "Only booked stay can be cancelled" });
  }

  const result = await persistStayStatusChange(stay, {
    nextStatus: "cancelled",
    actor,
    comment,
    roomDirective: "skip",
  });

  const updatedRoom = await updateRoomStatus(result.room.id, actor, {
    comment,
  });

  return res.json({
    message: "Stay cancelled successfully",
    stay: sortStayLogs(result.stay),
    room: updatedRoom ?? result.room,
  });
};

export const updateStayStatus = async (req: AuthRequest, res: Response) => {
  const ownerAdminId = getOwnerAdminId(req);
  const stayId = Number(req.params.id);
  const { status, comment } = req.body as {
    status: StayStatus;
    comment?: string | null;
  };

  const validStatuses: StayStatus[] = [
    "booked",
    "occupied",
    "completed",
    "cancelled",
  ];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({
      message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
    });
  }

  const stay = await loadStayWithRoom(stayId, ownerAdminId);
  if (!stay) {
    return res.status(404).json({ message: "Stay not found" });
  }

  const actor = await resolveActor(req);
  const trimmedComment = comment?.toString().trim() ?? "";

  if (status === "completed" && !isCheckoutToday(stay)) {
    return res.status(400).json({
      message: "Stay can be marked as completed only on the checkout date",
    });
  }

  let finalComment: string | null = null;
  if (status === "cancelled") {
    if (actor.stayRole === "guest") {
      finalComment = trimmedComment || "Booking cancelled by guest";
    } else {
      if (!trimmedComment) {
        return res
          .status(400)
          .json({ message: "Cancellation comment is required" });
      }
      finalComment = trimmedComment;
    }
  } else if (trimmedComment.length > 0) {
    finalComment = trimmedComment;
  }

  const roomDirective = status === "cancelled" ? "skip" : "auto";

  const result = await persistStayStatusChange(stay, {
    nextStatus: status,
    actor,
    comment: finalComment,
    roomDirective,
  });

  let room = result.room;
  if (status === "cancelled") {
    room = (await updateRoomStatus(result.room.id, actor, {
      comment: finalComment ?? null,
    })) ?? result.room;
  }

  const stayWithSortedLogs = sortStayLogs(result.stay);
  const recentLogs = stayWithSortedLogs.statusLogs.slice(0, 10);

  return res.json({
    message: "Stay status updated successfully",
    stay: stayWithSortedLogs,
    room,
    logs: recentLogs,
  });
};

/**
 * GET /stays/needs-action
 * Повертає список stays, які потребують дії (needsAction = true).
 * Використовується для відображення просрочених check-in/check-out.
 */
export const getNeedsActionStays = async (req: AuthRequest, res: Response) => {
  try {
    // Додаткова перевірка для редакторів
    if (!req.user) {
      return res.status(401).json({ message: "No token provided" });
    }
    if (req.user.role !== "admin" && req.user.role !== "editor") {
      return res.status(403).json({ message: "Access denied" });
    }
    
    const ownerAdminId = getOwnerAdminId(req);
    console.log("[getNeedsActionStays] Fetching stays for adminId:", ownerAdminId, "role:", req.user.role);

    const stays = await AppDataSource.getRepository(Stay).find({
      where: {
        needsAction: true,
        room: { admin: { id: ownerAdminId } },
      },
      relations: ["room"],
      order: { checkIn: "ASC", id: "ASC" },
    });

    console.log("[getNeedsActionStays] Found", stays.length, "stays requiring action");

  const items = stays.map((s) => {
    // Конвертуємо дати в формат YYYY-MM-DD для OpenAPI схеми
    const checkInDate = s.checkIn instanceof Date 
      ? s.checkIn.toISOString().split("T")[0] 
      : s.checkIn;
    const checkOutDate = s.checkOut instanceof Date 
      ? s.checkOut.toISOString().split("T")[0] 
      : s.checkOut;

    return {
      id: s.id,
      roomNumber: s.room.roomNumber,
      mainGuestName: s.mainGuestName,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      status: s.status, // "booked" | "occupied" - не змінюється
      needsAction: s.needsAction,
      needsActionReason: s.needsActionReason, // "missed_checkin" | "missed_checkout"
    };
  });

    return res.json({ count: items.length, items });
  } catch (error) {
    console.error("[getNeedsActionStays] Error:", error);
    return res.status(500).json({
      message: "Failed to fetch stays requiring action",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * POST /stays/test-auto-check
 * Тестовий endpoint для ручного запуску перевірки просрочених stays.
 * Використовується для тестування логіки needsAction без очікування cron job.
 */
export const testAutoCheck = async (req: AuthRequest, res: Response) => {
  try {
    const { StayAutoCheckService } = await import(
      "../services/cron/stayAutoCheck.service"
    );
    const service = new StayAutoCheckService();
    const stats = await service.checkOverdueStays();
    return res.json({
      message: "Auto-check completed successfully",
      stats,
    });
  } catch (error) {
    console.error("[testAutoCheck] Error:", error);
    return res.status(500).json({
      message: "Failed to run auto-check",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * POST /stays/:id/resolve/no-show
 * Скасовує stay (зміна статусу на cancelled).
 * Очищає needsAction та needsActionReason.
 * Логує зміну статусу.
 */
export const resolveNoShow = async (req: AuthRequest, res: Response) => {
  const ownerAdminId = getOwnerAdminId(req);
  const stayId = Number(req.params.id);
  const actor = await resolveActor(req);
  const { comment } = (req.body ?? {}) as { comment?: string };

  const stay = await loadStayWithRoom(stayId, ownerAdminId);
  if (!stay) {
    return res.status(404).json({ message: "Stay not found" });
  }

  if (!stay.needsAction || stay.needsActionReason !== "missed_checkin") {
    return res.status(400).json({
      message: "Stay does not require no-show resolution",
    });
  }

  // Встановлюємо статус cancelled
  const result = await persistStayStatusChange(stay, {
    nextStatus: "cancelled",
    actor,
    comment: comment ?? "Cancelled: guest did not arrive",
    roomDirective: "skip",
  });

  // Очищаємо needsAction
  stay.needsAction = false;
  stay.needsActionReason = null;
  await AppDataSource.getRepository(Stay).save(stay);

  const updatedRoom = await updateRoomStatus(result.room.id, actor, {
    comment: comment ?? null,
  });

  return res.json({
    message: "Stay cancelled successfully",
    stay: sortStayLogs(result.stay),
    room: updatedRoom ?? result.room,
  });
};

/**
 * POST /stays/:id/resolve/check-in-now
 * Виконує check-in зараз (occupied).
 * Встановлює checkIn = today.
 * Оновлює room.status = "occupied".
 * Очищає needsAction.
 */
export const resolveCheckInNow = async (req: AuthRequest, res: Response) => {
  try {
    const ownerAdminId = getOwnerAdminId(req);
    const stayId = Number(req.params.id);
    const actor = await resolveActor(req);
    const { comment } = (req.body ?? {}) as { comment?: string };

    const stay = await loadStayWithRoom(stayId, ownerAdminId);
    if (!stay) {
      return res.status(404).json({ message: "Stay not found" });
    }

    if (!stay.needsAction || stay.needsActionReason !== "missed_checkin") {
      return res.status(400).json({
        message: "Stay does not require check-in resolution",
      });
    }

    // Проверка состояния комнаты: не должна быть occupied или cleaning
    if (stay.room.status === "occupied" || stay.room.status === "cleaning") {
      return res.status(400).json({
        message: "Room is not available for check-in. Current status: " + stay.room.status,
      });
    }

    // Проверка конфликтов: проверяем, нет ли другого occupied stay в этой комнате
    const stayRepo = AppDataSource.getRepository(Stay);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkOutDate = new Date(stay.checkOut);
    checkOutDate.setHours(0, 0, 0, 0);

    const conflictingStays = await stayRepo
      .createQueryBuilder("s")
      .leftJoin("s.room", "r")
      .where("r.id = :roomId", { roomId: stay.room.id })
      .andWhere("s.id != :stayId", { stayId: stay.id })
      .andWhere("s.status = :status", { status: "occupied" })
      .andWhere("s.checkIn < :checkOut AND s.checkOut > :checkIn", {
        checkIn: today,
        checkOut: checkOutDate,
      })
      .getMany();

    if (conflictingStays.length > 0) {
      return res.status(400).json({
        message: "Room is already occupied by another stay during this period",
      });
    }

    // Встановлюємо checkIn = today
    stay.checkIn = today;
    await AppDataSource.getRepository(Stay).save(stay);

    // Встановлюємо статус occupied
    const result = await persistStayStatusChange(stay, {
      nextStatus: "occupied",
      actor,
      comment: comment ?? "Check-in performed manually after missed check-in date",
      roomDirective: "auto", // room.status = "occupied"
    });

    // Очищаємо needsAction
    stay.needsAction = false;
    stay.needsActionReason = null;
    await AppDataSource.getRepository(Stay).save(stay);

    return res.json({
      message: "Stay checked in successfully",
      stay: sortStayLogs(result.stay),
      room: result.room,
    });
  } catch (error) {
    console.error("[resolveCheckInNow] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({
      message: `Failed to check in stay: ${errorMessage}`,
    });
  }
};

/**
 * POST /stays/:id/resolve/check-out-now
 * Виконує check-out зараз (completed).
 * Оновлює room.status = "free".
 * Створює cleaning log (якщо потрібно).
 * Очищає needsAction.
 */
export const resolveCheckOutNow = async (req: AuthRequest, res: Response) => {
  const ownerAdminId = getOwnerAdminId(req);
  const stayId = Number(req.params.id);
  const actor = await resolveActor(req);
  const { comment } = (req.body ?? {}) as { comment?: string };

  const stay = await loadStayWithRoom(stayId, ownerAdminId);
  if (!stay) {
    return res.status(404).json({ message: "Stay not found" });
  }

  if (!stay.needsAction || stay.needsActionReason !== "missed_checkout") {
    return res.status(400).json({
      message: "Stay does not require check-out resolution",
    });
  }

  // Встановлюємо статус completed
  const result = await persistStayStatusChange(stay, {
    nextStatus: "completed",
    actor,
    comment: comment ?? "Check-out performed manually after missed check-out date",
    roomDirective: "auto", // room.status = "cleaning"
  });

  // Очищаємо needsAction
  stay.needsAction = false;
  stay.needsActionReason = null;
  await AppDataSource.getRepository(Stay).save(stay);

  return res.json({
    message: "Stay checked out successfully",
    stay: sortStayLogs(result.stay),
    room: result.room,
  });
};

/**
 * POST /stays/:id/resolve/edit-dates
 * Оновлює дати check-in або check-out.
 * Очищає needsAction.
 * Зберігає існуючий статус (booked/occupied).
 */
export const resolveEditDates = async (req: AuthRequest, res: Response) => {
  try {
    const ownerAdminId = getOwnerAdminId(req);
    const stayId = Number(req.params.id);
    const { checkIn, checkOut } = req.body as {
      checkIn?: string;
      checkOut?: string;
    };

    const stay = await loadStayWithRoom(stayId, ownerAdminId);
    if (!stay) {
      return res.status(404).json({ message: "Stay not found" });
    }

    if (!stay.needsAction) {
      return res.status(400).json({
        message: "Stay does not require date edit resolution",
      });
    }

    // Вычисляем новые даты для проверки конфликтов
    let newCheckIn: Date;
    let newCheckOut: Date;
    
    try {
      newCheckIn = checkIn ? new Date(checkIn) : new Date(stay.checkIn);
      newCheckIn.setHours(0, 0, 0, 0);
      newCheckOut = checkOut ? new Date(checkOut) : new Date(stay.checkOut);
      newCheckOut.setHours(0, 0, 0, 0);
    } catch (dateError) {
      return res.status(400).json({
        message: "Invalid date format. Please use YYYY-MM-DD format",
      });
    }

    // Валидация: checkOut должен быть после checkIn
    if (newCheckOut <= newCheckIn) {
      return res.status(400).json({
        message: "Check-out date must be after check-in date",
      });
    }

    // Проверка конфликтов: проверяем, нет ли других активных stays в этой комнате с пересекающимися датами
    const stayRepo = AppDataSource.getRepository(Stay);
    const conflictingStays = await stayRepo
      .createQueryBuilder("s")
      .leftJoin("s.room", "r")
      .where("r.id = :roomId", { roomId: stay.room.id })
      .andWhere("s.id != :stayId", { stayId: stay.id })
      .andWhere("s.status IN (:...activeStatuses)", {
        activeStatuses: ["booked", "occupied"],
      })
      .andWhere("s.checkIn < :newCheckOut AND s.checkOut > :newCheckIn", {
        newCheckIn,
        newCheckOut,
      })
      .getMany();

    if (conflictingStays.length > 0) {
      const conflictInfo = conflictingStays.map((s) => ({
        id: s.id,
        guest: s.mainGuestName,
        checkIn: s.checkIn.toISOString().slice(0, 10),
        checkOut: s.checkOut.toISOString().slice(0, 10),
        status: s.status,
      }));
      return res.status(400).json({
        message: "The selected dates conflict with existing bookings in this room",
        conflicts: conflictInfo,
      });
    }

    // Оновлюємо дати якщо надані
    if (checkIn) {
      stay.checkIn = newCheckIn;
    }

    if (checkOut) {
      stay.checkOut = newCheckOut;
    }

    // Очищаємо needsAction
    stay.needsAction = false;
    stay.needsActionReason = null;

    await AppDataSource.getRepository(Stay).save(stay);

    // Оновлюємо stay з relations для відповіді
    const updatedStay = await AppDataSource.getRepository(Stay).findOne({
      where: { id: stay.id },
      relations: ["room", "statusLogs", "guests"],
    });

    if (!updatedStay) {
      return res.status(500).json({ 
        message: "Failed to refresh stay after update. Please try again." 
      });
    }

    return res.json({
      message: "Stay dates updated successfully",
      stay: sortStayLogs(updatedStay),
    });
  } catch (error) {
    console.error("[resolveEditDates] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({
      message: `Failed to update stay dates: ${errorMessage}`,
    });
  }
};

/**
 * POST /stays/:id/resolve/extend-stay
 * Продовжує stay (оновлює checkOut).
 * Очищає needsAction.
 */
export const resolveExtendStay = async (req: AuthRequest, res: Response) => {
  try {
    const ownerAdminId = getOwnerAdminId(req);
    const stayId = Number(req.params.id);
    const { checkOut } = req.body as { checkOut: string };

    if (!checkOut) {
      return res.status(400).json({ message: "checkOut is required" });
    }

    const stay = await loadStayWithRoom(stayId, ownerAdminId);
    if (!stay) {
      return res.status(404).json({ message: "Stay not found" });
    }

    if (!stay.needsAction || stay.needsActionReason !== "missed_checkout") {
      return res.status(400).json({
        message: "Stay does not require extend resolution",
      });
    }

    // Вычисляем новую дату выезда для проверки конфликтов
    let checkOutDate: Date;
    let checkInDate: Date;
    
    try {
      checkOutDate = new Date(checkOut);
      checkOutDate.setHours(0, 0, 0, 0);
      checkInDate = new Date(stay.checkIn);
      checkInDate.setHours(0, 0, 0, 0);
    } catch (dateError) {
      return res.status(400).json({
        message: "Invalid date format. Please use YYYY-MM-DD format",
      });
    }

    // Валидация: checkOut должен быть после checkIn
    if (checkOutDate <= checkInDate) {
      return res.status(400).json({
        message: "Check-out date must be after check-in date",
      });
    }

    // Проверка конфликтов: проверяем, нет ли других активных stays в этой комнате с пересекающимися датами
    const stayRepo = AppDataSource.getRepository(Stay);
    const conflictingStays = await stayRepo
      .createQueryBuilder("s")
      .leftJoin("s.room", "r")
      .where("r.id = :roomId", { roomId: stay.room.id })
      .andWhere("s.id != :stayId", { stayId: stay.id })
      .andWhere("s.status IN (:...activeStatuses)", {
        activeStatuses: ["booked", "occupied"],
      })
      .andWhere("s.checkIn < :newCheckOut AND s.checkOut > :checkIn", {
        checkIn: checkInDate,
        newCheckOut: checkOutDate,
      })
      .getMany();

    if (conflictingStays.length > 0) {
      const conflictInfo = conflictingStays.map((s) => ({
        id: s.id,
        guest: s.mainGuestName,
        checkIn: s.checkIn.toISOString().slice(0, 10),
        checkOut: s.checkOut.toISOString().slice(0, 10),
        status: s.status,
      }));
      return res.status(400).json({
        message: "The extended dates conflict with existing bookings in this room",
        conflicts: conflictInfo,
      });
    }

    // Оновлюємо checkOut
    stay.checkOut = checkOutDate;

    // Очищаємо needsAction
    stay.needsAction = false;
    stay.needsActionReason = null;

    await AppDataSource.getRepository(Stay).save(stay);

    // Оновлюємо stay з relations для відповіді
    const updatedStay = await AppDataSource.getRepository(Stay).findOne({
      where: { id: stay.id },
      relations: ["room", "statusLogs", "guests"],
    });

    if (!updatedStay) {
      return res.status(500).json({ 
        message: "Failed to refresh stay after update. Please try again." 
      });
    }

    return res.json({
      message: "Stay extended successfully",
      stay: sortStayLogs(updatedStay),
    });
  } catch (error) {
    console.error("[resolveExtendStay] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({
      message: `Failed to extend stay: ${errorMessage}`,
    });
  }
};
