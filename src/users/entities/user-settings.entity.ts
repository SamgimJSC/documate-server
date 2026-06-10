import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('user_settings')
export class UserSettings {
  @PrimaryGeneratedColumn('uuid', { name: 'setting_id' })
  settingId: string;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId: string;

  @Column({ name: 'push_enabled', type: 'boolean', default: true })
  pushEnabled: boolean;

  @Column({ name: 'email_noti_enabled', type: 'boolean', default: true })
  emailNotiEnabled: boolean;

  @Column({
    name: 'camera_auto_ocr',
    type: 'boolean',
    default: true,
    nullable: true,
  })
  cameraAutoOcr: boolean | null;

  @Column({
    name: 'dark_mode',
    type: 'boolean',
    default: false,
    nullable: true,
  })
  darkMode: boolean | null;

  @Column({
    name: 'app_lock_enabled',
    type: 'boolean',
    default: false,
    nullable: true,
  })
  appLockEnabled: boolean | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
