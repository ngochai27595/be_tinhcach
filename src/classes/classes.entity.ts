import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity()
export class Classes {
  @PrimaryColumn({ length: 36 })
  id: string;

  @Column({ length: 10 })
  class_day: string;

  @Column({ length: 36 })
  curiculum_id: string;

  @Column({ length: 36 })
  parent_class_id: string;

  @Column({ length: 36 })
  subject_id: string;

  @Column({ length: 36 })
  teacher_id: string;

  @Column({ default: 0 })
  start_time: number;

  @Column({ default: 0 })
  type: number;

  @Column({ default: 0 })
  end_time: number;

  @Column({ default: 0 })
  created_at: number;

  @Column({ default: 0 })
  updated_at: number;

  @Column({ default: 1 })
  status: number;
}
