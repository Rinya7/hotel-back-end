import { Stay } from "../entities/Stay";
import { Room } from "../entities/Room";
export type StayStatus = "booked" | "occupied" | "completed" | "cancelled";
export type RoomStatus = "free" | "occupied" | "cleaning";
export type StayActorRole = "guest" | "admin" | "editor";
export type RoomActorRole = "system" | "admin" | "editor";

export interface ActorContext {
    username: string;
    stayRole: StayActorRole;
    roomRole: RoomActorRole;
  }
  
  export interface StatusChangeResult {
    stay: Stay;
    room: Room;
  }