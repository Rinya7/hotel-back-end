import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { Room } from "./Room";

@Entity()
export class Stay {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Room, (room) => room.stays)
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

  @Column({ default: "free" }) // або "booked", "occupied"
  status!: "free" | "booked" | "occupied";
}
