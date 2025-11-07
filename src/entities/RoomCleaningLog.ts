// src/entities/RoomCleaningLog.ts
// Логи прибирання номера. Зберігаємо хто і коли завершив cleaning, опційно з нотаткою.

import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  CreateDateColumn,
} from "typeorm";
import { Room } from "./Room";

type CleaningActorRole = "admin" | "editor" | "system";

@Entity("room_cleaning_log")
export class RoomCleaningLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Room, (room) => room.cleaningLogs, {
    onDelete: "CASCADE",
  })
  room!: Room;

  @Column({ type: "varchar", length: 50, nullable: true })
  cleanedBy?: string | null;

  @Column({
    type: "varchar",
    length: 20,
    nullable: true,
  })
  cleanedByRole?: CleaningActorRole | null;

  @CreateDateColumn()
  cleanedAt!: Date;

  @Column({ type: "text", nullable: true })
  notes?: string | null;
}


