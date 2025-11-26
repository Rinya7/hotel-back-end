import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Stay } from "./Stay";

@Entity("stay_guest")
export class StayGuest {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Stay, (stay) => stay.guests, { onDelete: "CASCADE" })
  stay!: Stay;

  @Column({ type: "varchar", length: 100 })
  firstName!: string;

  @Column({ type: "varchar", length: 100 })
  lastName!: string;

  @Column({ type: "varchar", length: 150, nullable: true })
  email?: string | null;

  @Column({ type: "varchar", length: 10, nullable: true })
  phoneCountryCode?: string | null; // Код страны (например, +39, +380)

  @Column({ type: "varchar", length: 50, nullable: true })
  phoneNumber?: string | null; // Номер телефона без кода страны

  @Column({ type: "varchar", length: 50, nullable: true })
  documentType?: string | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  documentNumber?: string | null;

  @Column({ type: "date", nullable: true })
  birthDate?: Date | null;

  @Column({ type: "text", nullable: true })
  notes?: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}




