import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity()
export class ReviewValues {
  @PrimaryColumn({ length: 36 })
  id: string;

  @PrimaryColumn({ length: 36 })
  review_id: string;

  @PrimaryColumn({ length: 36 })
  field_id: string;

  @Column({ length: 2023, default: '' })
  value: string;

  @Column({ default: 0 })
  created_at: number;

  @Column({ default: 0 })
  is_enable: number;

  @Column({ default: 0 })
  updated_at: number;

  @Column({ default: '' })
  createdBy: string;
}
