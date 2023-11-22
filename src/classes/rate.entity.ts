import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity()
export class Rates {
  @PrimaryColumn({ length: 36 })
  id: string;

  @Column({ length: 36 })
  curricolum_id: string;

  @Column({ default: 0 })
  class_scope: number;

  @Column({ default: 0 })
  tuition: number;

  @Column({ default: 0 })
  rate: number;

  @Column({ default: 0 })
  bonus: number;
}
