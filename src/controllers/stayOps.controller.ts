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

type StayStatus = "booked" | "occupied" | "completed" | "cancelled";
type RoomStatus = "free" | "booked" | "occupied" | "cleaning";
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
  booked: "booked",
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
    relations: ["room", "room.admin"],
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
      relations: ["room", "statusLogs"],
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
    relations: ["room", "statusLogs"],
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
  if (skipWhenCleaning && room.status === "cleaning") {
    return room;
  }

  const activeStays = room.stays.filter((s) =>
    ["booked", "occupied"].includes(s.status)
  );

  let nextStatus: RoomStatus = room.status;
  if (activeStays.some((s) => s.status === "occupied")) {
    nextStatus = "occupied";
  } else if (activeStays.some((s) => s.status === "booked")) {
    nextStatus = "booked";
  } else {
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

  const result = await persistStayStatusChange(stay, {
    nextStatus: "occupied",
    actor,
    comment,
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
