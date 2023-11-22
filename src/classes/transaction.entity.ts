import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity()
export class Transactions {
  @PrimaryColumn({ length: 36 })
  id: string;

  @Column({ length: 36 })
  user_id: string;

  @Column({ length: 36 })
  finished_by: string;

  @Column({ length: 36 })
  class_id: string;

  @Column({ default: 0 })
  finished_at: number;

  @Column({ default: 0 })
  discount_value: number;

  @Column({ default: 0 })
  type: number;

  @Column('longtext')
  description: string;

  @Column({ default: 0 })
  balance: number;

  @Column({ default: 0 })
  created_at: number;

  @Column({ default: 0 })
  updated_at: number;

  @Column({ default: 1 })
  status: number;
}
