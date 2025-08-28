// src/entities/Admin.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Check,
} from "typeorm";
import { Room } from "./Room";
import { ROLES, Role } from "../auth/roles";

@Entity()
@Check(`"checkInHour" >= 0 AND "checkInHour" <= 23`)
@Check(`"checkOutHour" >= 0 AND "checkOutHour" <= 23`)
export class Admin {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  username!: string;

  @Column()
  password!: string;

  // Роль: 'admin' = головний, 'editor' = помічник
  @Column({ type: "enum", enum: Object.values(ROLES), default: ROLES.ADMIN })
  role!: Role;

  // для супер-адміна тримаємо nullable, але в сиді все одно заповнимо
  @Column({ nullable: true }) hotel_name?: string;
  @Column({ nullable: true }) address?: string;

  @Column({ nullable: true }) full_name?: string;
  @Column({ nullable: true }) logo_url?: string;
  @Column({ nullable: true }) phone?: string;
  @Column({ nullable: true }) email?: string;

  // Якщо це editor — хто його створив
  @ManyToOne(() => Admin, (admin) => admin.createdEditorAdmins, {
    nullable: true,
    onDelete: "CASCADE", // ⬅ каскадне видалення editor’ів при видаленні admin
  })
  createdBy!: Admin;

  // Якщо це головний адмін — його список editor'ів
  @OneToMany(() => Admin, (admin) => admin.createdBy, {
    cascade: true, // ⬅ щоб автоматично видаляти editor’ів
  })
  createdEditorAdmins!: Admin[];

  // Всі номери, якими володіє цей адмін
  @OneToMany(() => Room, (room) => room.admin, {
    // для реального каскаду видалення додай ON DELETE CASCADE у FK на стороні Room (див. нижче)
  })
  rooms!: Room[];

  @Column({ default: false })
  isBlocked!: boolean;

  /** ⬇️ NEW: Hotel policy hours (per hotel / main admin) */
  @Column({ type: "int", default: 14 })
  checkInHour!: number; // 0..23

  @Column({ type: "int", default: 10 })
  checkOutHour!: number; // 0..23

  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
