import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Room } from "./Room";

@Entity()
export class Stay {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Room, (room) => room.stays, { onDelete: "CASCADE" })
  room!: Room;

  @Column()
  mainGuestName!: string;

  @Column("text", { array: true, nullable: true })
  extraGuestNames!: string[];

  @Column({ type: "date" })
  checkIn!: Date;

  @Column({ type: "date" })
  checkOut!: Date;

  @Column({ type: "decimal", default: 0 })
  balance!: number;

  @Column({ default: "booked" })
  status!: "booked" | "occupied" | "completed" | "cancelled";

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
