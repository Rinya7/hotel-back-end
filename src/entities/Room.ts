import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  Unique,
} from "typeorm";
import { Stay } from "./Stay";
import { Admin } from "./Admin";

@Entity()
@Unique(["admin", "roomNumber"]) // ✅ уникальность в рамках отеля
export class Room {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Admin, (admin) => admin.rooms, { onDelete: "CASCADE" })
  admin!: Admin;

  @Column()
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

  @Column({
    type: "enum",
    enum: ["free", "booked", "occupied"],
    default: "free",
  })
  status!: "free" | "booked" | "occupied";

  @OneToMany(() => Stay, (stay) => stay.room)
  stays!: Stay[];
}
