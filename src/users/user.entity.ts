import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity()
export class Users {
  @PrimaryColumn({ length: 36 })
  id: string;

  @Column({ length: 36 })
  username: string;

  @Column({ length: 36 })
  email: string;

  @Column({ length: 36, default: '' })
  phone: string;

  @Column({ length: 100 })
  name: string;

  @Column({ default: 0 })
  type: number;

  @Column({ default: 1 })
  is_enable: number;

  @Column({ default: 10 })
  remaining_view: number;
}
