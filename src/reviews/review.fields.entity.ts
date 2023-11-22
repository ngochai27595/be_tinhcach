import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity()
export class ReviewFields {
  @PrimaryColumn({ length: 36 })
  id: string;

  @Column({ length: 100, default: '' })
  field_name: string;

  @Column({ default: 0 })
  created_at: number;

  @Column({ default: 0 })
  updated_at: number;
}
