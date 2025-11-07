// src/entities/RoomStatusLog.ts
// Історія змін статусів номерів (Room)
import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
} from "typeorm";
import { Room } from "./Room";
import { Stay } from "./Stay";

type RoomStatus = "free" | "booked" | "occupied" | "cleaning";

@Entity("room_status_log")
export class RoomStatusLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Room, (room) => room.statusLogs, { onDelete: "CASCADE" })
  room!: Room;

  // Зв'язок з Stay (якщо зміна статусу Room була через зміну Stay)
  @ManyToOne(() => Stay, (stay) => stay.roomStatusLogs, { nullable: true })
  stay?: Stay;

  @Column({ type: "varchar", length: 20 })
  oldStatus!: RoomStatus;

  @Column({ type: "varchar", length: 20 })
  newStatus!: RoomStatus;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  changedAt!: Date;

  @Column({ type: "varchar", length: 50, nullable: true })
  changedBy?: string; // username або "system"

  @Column({ type: "varchar", length: 20, nullable: true })
  changedByRole?: "system" | "admin" | "editor";

  @Column({ type: "text", nullable: true })
  comment?: string | null;
}

