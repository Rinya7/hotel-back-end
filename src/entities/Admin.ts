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
  @Column({ default: "admin" })
  role!: "admin" | "editor";

  // Якщо це editor — хто його створив
  @ManyToOne(() => Admin, (admin) => admin.createdEditorAdmins, {
    nullable: true,
  })
  createdBy!: Admin;

  // Якщо це головний адмін — його список editor'ів
  @OneToMany(() => Admin, (admin) => admin.createdBy)
  createdEditorAdmins!: Admin[];

  // Всі номери, якими володіє цей адмін
  @OneToMany(() => Room, (room) => room.admin)
  rooms!: Room[];
}
