import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
} from "typeorm";
import { Stay } from "./Stay";
import { Admin } from "./Admin";

@Entity()
export class Room {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Admin, (admin) => admin.rooms, { onDelete: "CASCADE" })
  admin!: Admin;

  @Column({ unique: true }) // 👈 тепер це унікальне поле, яке вводиться вручну
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

  @Column({ default: "free" })
  status!: "free" | "booked" | "occupied";

  @OneToMany(() => Stay, (stay) => stay.room)
  stays!: Stay[];
}
