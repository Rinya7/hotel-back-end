// src/entities/StayStatusLog.ts
// Історія змін статусів проживань (Stay)
import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
} from "typeorm";
import { Stay } from "./Stay";

type StayStatus = "booked" | "occupied" | "completed" | "cancelled";

@Entity("stay_status_log")
export class StayStatusLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Stay, (stay) => stay.statusLogs, { onDelete: "CASCADE" })
  stay!: Stay;

  @Column({ type: "varchar", length: 20 })
  oldStatus!: StayStatus;

  @Column({ type: "varchar", length: 20 })
  newStatus!: StayStatus;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  changedAt!: Date;

  @Column({ type: "varchar", length: 50, nullable: true })
  changedBy?: string; // username або "guest"

  @Column({ type: "varchar", length: 20, nullable: true })
  changedByRole?: "guest" | "admin" | "editor";

  @Column({ type: "text", nullable: true })
  comment?: string | null;
}

