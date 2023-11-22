import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity()
export class Labels {
  @PrimaryColumn({ length: 36 })
  id: string;

  @Column({ length: 100, default: '' })
  name: string;

  @Column({ default: 1 })
  level: number;

  @Column({ default: 0 })
  created_at: number;

  @Column({ default: 0 })
  updated_at: number;
}
