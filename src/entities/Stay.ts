// src/entities/Stay.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Room } from "./Room";

@Entity()
export class Stay {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Room, (room) => room.stays, { onDelete: "CASCADE" })
  room!: Room;

  @Column()
  mainGuestName!: string;

  @Column("text", { array: true, nullable: true })
  extraGuestNames!: string[];

  @Column({ type: "date" })
  checkIn!: Date;

  @Column({ type: "date" })
  checkOut!: Date;

  @Column({ type: "numeric", precision: 10, scale: 2, default: 0 })
  balance!: string; // Postgres numeric → приходит строкой, на фронте приводим к number

  @Column({
    type: "enum",
    enum: ["booked", "occupied", "completed", "cancelled"],
    default: "booked",
  })
  status!: "booked" | "occupied" | "completed" | "cancelled";

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
