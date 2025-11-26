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

  @Column({ type: "varchar", length: 100, nullable: true })
  firstName?: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  lastName?: string | null;

  @Column({ type: "varchar", length: 150, nullable: true })
  email?: string | null;

  @Column({ type: "varchar", length: 10, nullable: true })
  phoneCountryCode?: string | null; // Код страны (например, +39, +380)

  @Column({ type: "varchar", length: 50, nullable: true })
  phoneNumber?: string | null; // Номер телефона без кода страны

  @Column({ type: "int", nullable: true, default: 1 })
  guestsCount?: number | null;

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

  /**
   * Прапорець, що вказує, чи потребує Stay дії від адміністратора.
   * Встановлюється автоматично cron job при просрочених check-in/check-out.
   * НЕ впливає на існуючу логіку фільтрації по статусах.
   */
  @Column({
    type: "boolean",
    name: "needsAction",
    default: false,
    nullable: false,
  })
  needsAction!: boolean;

  /**
   * Причина, чому Stay потребує дії.
   * "missed_checkin" - check-in дата минула, але статус все ще "booked"
   * "missed_checkout" - check-out дата минула, але статус все ще "occupied"
   * null - не потребує дії або причина не визначена
   */
  @Column({
    type: "varchar",
    length: 50,
    name: "needsActionReason",
    nullable: true,
  })
  needsActionReason!: "missed_checkin" | "missed_checkout" | null;

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
