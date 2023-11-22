import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity()
export class Reviews {
  @PrimaryColumn({ length: 36 })
  id: string;

  @Column({ length: 255, default: '' })
  authorName: string;

  @Column({ length: 100, default: '' })
  packageName: string;

  @Column({ length: 50 })
  os: string;

  @Column({ default: 0 })
  created_at: number;

  @Column({ default: 0 })
  updated_at: number;
}
