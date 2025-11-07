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

  /** ⬇️ Детальна адреса готелю */
  @Column({ type: "varchar", length: 255, nullable: true })
  street?: string | null; // Улица

  @Column({ type: "varchar", length: 50, nullable: true })
  buildingNumber?: string | null; // Номер здания

  @Column({ type: "varchar", length: 50, nullable: true })
  apartmentNumber?: string | null; // Номер помещения (опционально)

  @Column({ type: "varchar", length: 100, nullable: true })
  country?: string | null; // Страна

  @Column({ type: "varchar", length: 255, nullable: true })
  province?: string | null; // Провинция/Регион

  @Column({ type: "varchar", length: 20, nullable: true })
  postalCode?: string | null; // Почтовый индекс

  @Column({ type: "decimal", precision: 10, scale: 7, nullable: true })
  latitude?: string | null; // Широта для карты (decimal для точности координат)

  @Column({ type: "decimal", precision: 10, scale: 7, nullable: true })
  longitude?: string | null; // Долгота для карты

  @Column({ type: "varchar", length: 255, nullable: true }) full_name?:
    | string
    | null;
  @Column({ type: "varchar", length: 255, nullable: true }) logo_url?:
    | string
    | null;
  /** ⬇️ Телефон разделен на код страны и номер для поддержки международных форматов */
  @Column({ type: "varchar", length: 10, nullable: true })
  phoneCountryCode?: string | null; // Код страны (например, +39, +380)

  @Column({ type: "varchar", length: 50, nullable: true })
  phoneNumber?: string | null; // Номер телефона без кода страны
  @Column({ type: "varchar", length: 255, nullable: true }) email?:
    | string
    | null;

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
  // 🔧 Значения по умолчанию (14/10) можно изменить в src/constants/defaults.ts
  @Column({ type: "int", nullable: true, default: 14 })
  checkInHour!: number | null; // 0..23 (default: 14 - см. DEFAULT_CHECK_IN_HOUR в constants/defaults.ts)

  @Column({ type: "int", nullable: true, default: 10 })
  checkOutHour!: number | null; // 0..23 (default: 10 - см. DEFAULT_CHECK_OUT_HOUR в constants/defaults.ts)

  /** ⬇️ NEW: Hotel Wi-Fi settings (per hotel / main admin) */
  @Column({ type: "varchar", length: 255, nullable: true, default: "wifi_name" })
  defaultWifiName!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true, default: "admin" })
  defaultWifiPassword!: string | null;

  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
