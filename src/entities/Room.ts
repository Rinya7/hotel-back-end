// src/entities/Room.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  Unique,
  CreateDateColumn,
  UpdateDateColumn,
  Check,
} from "typeorm";
import { Stay } from "./Stay";
import { Admin } from "./Admin";

@Entity()
@Unique(["admin", "roomNumber"]) // ✅ уникальность в рамках отеля
@Check(`"checkInHour" IS NULL OR ("checkInHour" BETWEEN 0 AND 23)`)
@Check(`"checkOutHour" IS NULL OR ("checkOutHour" BETWEEN 0 AND 23)`)
export class Room {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Admin, (admin) => admin.rooms, { onDelete: "CASCADE" })
  admin!: Admin;

  @Column()
  roomNumber!: string;

  @Column()
  floor!: number;

  @Column()
  capacity!: number;

  /** Explicit SQL type is required because TS union (string|null) → design:type = Object */
  @Column({ type: "varchar", length: 100, nullable: true })
  wifiName!: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  wifiPassword!: string | null;

  /** URLs can be long → use text */
  @Column({ type: "text", nullable: true })
  qrBarUrl!: string | null;

  /** Map position payload can be arbitrary → use text */
  @Column({ type: "text", nullable: true })
  mapPosition!: string | null;

  @Column({
    type: "enum",
    enum: ["free", "booked", "occupied"],
    default: "free",
  })
  status!: "free" | "booked" | "occupied";

  /** Per-room policy hours (override admin). NULL → follow admin defaults */
  @Column({ type: "int", nullable: true })
  checkInHour?: number | null;

  @Column({ type: "int", nullable: true })
  checkOutHour?: number | null;

  @OneToMany(() => Stay, (stay) => stay.room)
  stays!: Stay[];

  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
