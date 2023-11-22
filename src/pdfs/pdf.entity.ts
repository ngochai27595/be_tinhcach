import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity()
export class Pdfs {
  @PrimaryColumn({ length: 36 })
  id: string;

  @Column({ length: 255 })
  title: string;

  @Column({ length: 255, default: '' })
  drive: string;

  @Column({ length: 255, default: '' })
  file_url: string;

  @Column({ default: 0 })
  created_at: string;

  @Column({ length: 36, default: 0 })
  id_category: string;

  @Column({ default: 0 })
  status: number;

  @Column({ default: 0 })
  id_source: number;

  @Column({ default: 0 })
  page: number;

  @Column({ default: '' })
  source: string;

  @Column({ default: '' })
  file_type: string;

  @Column({ default: '' })
  thumb: string;
}
