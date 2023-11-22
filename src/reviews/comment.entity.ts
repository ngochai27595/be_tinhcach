import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity()
export class Comments {
  @PrimaryColumn({ length: 36 })
  id: string;

  @Column({ length: 255 })
  reviewId: string;

  @Column({ default: '' })
  lastModified: string;

  @Column('longtext')
  text: string;

  @Column('longtext')
  originalText: string;

  @Column('longtext')
  enText: string;

  @Column({ length: 10, default: '' })
  reviewerLanguage: string;

  @Column({ length: 255, default: '' })
  device: string;

  @Column({ default: 0 })
  osVerion: number;

  @Column({ default: 0 })
  rate: number;

  @Column({ default: 0 })
  appVersionCode: number;

  @Column({ default: 0 })
  type: number;

  @Column({ default: 1 })
  active: number;

  @Column('longtext')
  deviceMetadata: string;

  @Column({ default: '' })
  appVersionName: string;

  @Column({ default: '' })
  createdBy: string;
}
