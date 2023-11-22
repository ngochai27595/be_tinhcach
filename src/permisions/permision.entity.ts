import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity()
export class Permisions {
  @PrimaryColumn({ length: 36 })
  id: string;

  @Column({ length: 36 })
  role: string;

  @Column({ length: 100 })
  description: string;

  @Column({ default: 0 })
  level: number;
}
