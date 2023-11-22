import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity()
export class DiscountStudents {
  @PrimaryColumn({ length: 36 })
  id: string;

  @Column({ default: 0 })
  value: number;

  @Column({ length: 36 })
  student_id: string;

  @Column({ default: 0 })
  created_at: number;

  @Column({ default: 0 })
  updated_at: number;
}
