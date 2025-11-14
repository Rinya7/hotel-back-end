// src/entities/Stay.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Room } from "./Room";
import { StayStatusLog } from "./StayStatusLog";
import { RoomStatusLog } from "./RoomStatusLog";
import { StayGuest } from "./StayGuest";
import { GuestAccessToken } from "./GuestAccessToken";

@Entity()
export class Stay {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Room, (room) => room.stays, { onDelete: "CASCADE" })
  room!: Room;

  @Column()
  mainGuestName!: string;

  @Column("text", { array: true, nullable: true, default: () => "'{}'" })
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

  // Аудит: хто створив бронювання
  @Column({ type: "varchar", length: 50, nullable: true })
  createdBy?: string; // username або "guest"

  // Аудит: хто востаннє змінював статус
  @Column({ type: "varchar", length: 50, nullable: true })
  updatedBy?: string; // username або "guest"

  @Column({ type: "varchar", length: 20, nullable: true })
  updatedByRole?: "guest" | "admin" | "editor";

  // Зв'язок з логами змін статусів Stay
  @OneToMany(() => StayStatusLog, (log) => log.stay)
  statusLogs!: StayStatusLog[];

  @OneToMany(() => StayGuest, (guest) => guest.stay, { cascade: true })
  guests!: StayGuest[];

  // Зв'язок з логами змін статусів Room (якщо зміна була через Stay)
  @OneToMany(() => RoomStatusLog, (log) => log.stay)
  roomStatusLogs!: RoomStatusLog[];

  // Токени доступу гостя до цього проживання
  @OneToMany(() => GuestAccessToken, (token) => token.stay, {
    cascade: true,
  })
  guestTokens!: GuestAccessToken[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
