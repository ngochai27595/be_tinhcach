import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity()
export class UserPermisions {
  @PrimaryColumn({ length: 36 })
  id: string;

  @Column({ length: 36 })
  role_id: string;

  @Column({ length: 36 })
  user_id: string;
}
