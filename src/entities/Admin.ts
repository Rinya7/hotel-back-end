import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
} from "typeorm";
import { Room } from "./Room";

@Entity()
export class Admin {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  username!: string;

  @Column()
  password!: string;

  // Роль: 'admin' = головний, 'editor' = помічник
  @Column({
    type: "enum",
    enum: ["superadmin", "admin", "editor"],
    default: "admin",
  })
  role!: "superadmin" | "admin" | "editor";

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
}
