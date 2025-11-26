// src/types/room.ts

/** Narrow request body types (strict, no any) */
export interface CreateRoomBody {
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
  
  export interface UpdateRoomBody {
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