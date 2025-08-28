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

  @Column({ nullable: true })
  wifiName!: string;

  @Column({ nullable: true })
  wifiPassword!: string;

  @Column({ nullable: true })
  qrBarUrl!: string;

  @Column({ nullable: true })
  mapPosition!: string;

  @Column({
    type: "enum",
    enum: ["free", "booked", "occupied"],
    default: "free",
  })
  status!: "free" | "booked" | "occupied";

  /** Per-room policy hours (overrides admin). NULL -> use admin. */
  @Column({ type: "int", nullable: true })
  checkInHour?: number | null;

  @Column({ type: "int", nullable: true })
  checkOutHour?: number | null;

  @OneToMany(() => Stay, (stay) => stay.room)
  stays!: Stay[];

  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
