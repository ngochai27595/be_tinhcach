import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity()
export class ClassStudents {
  @PrimaryColumn({ length: 36 })
  id: string;

  @Column({ length: 36 })
  class_id: string;

  @Column({ length: 36 })
  student_id: string;

  @Column({ default: 0 })
  is_enabled: number;

  @Column({ default: 0 })
  created_at: number;

  @Column({ default: 0 })
  updated_at: number;

  @Column({ default: 1 })
  status: number;
}
