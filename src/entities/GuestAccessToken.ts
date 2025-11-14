// src/entities/GuestAccessToken.ts
// Токен доступу гостя до свого бронювання (Stay) по унікальному лінку

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Stay } from "./Stay";

@Entity("guest_access_token")
export class GuestAccessToken {
  @PrimaryGeneratedColumn()
  id!: number;

  // Зв'язок з конкретним проживанням (бронюванням)
  @ManyToOne(() => Stay, (stay) => stay.guestTokens, {
    onDelete: "CASCADE",
  })
  stay!: Stay;

  // Власне секретний токен, який ми вшиваємо в URL
  @Column({ type: "varchar", length: 255, unique: true })
  token!: string;

  // Коли токен створено
  @CreateDateColumn()
  createdAt!: Date;

  // Коли востаннє токен оновлювали (наприклад, якщо будемо подовжувати життя)
  @UpdateDateColumn()
  updatedAt!: Date;

  // Дата, після якої токен вважається простроченим (може бути null = безстроково)
  @Column({ type: "timestamp", nullable: true })
  expiresAt!: Date | null;

  // Якщо адміністратор вирішив відкликати доступ — ставимо дату
  @Column({ type: "timestamp", nullable: true })
  revokedAt!: Date | null;

  // Для статистики — коли гість востаннє заходив по цьому токену
  @Column({ type: "timestamp", nullable: true })
  lastUsedAt!: Date | null;
}
  