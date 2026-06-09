import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from '../global/constants/userRole.enum';
import { UserPlan } from '../global/constants/userPlan.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid', { name: 'user_id' })
  userId: string;

  @Column({ name: 'email', type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ name: 'password', type: 'varchar', length: 255 })
  password: string;

  @Column({ name: 'nickname', type: 'varchar', length: 30 })
  nickname: string;

  @Column({ name: 'real_name', type: 'varchar', length: 50, nullable: true })
  realName: string | null;

  @Column({
    name: 'profile_img_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  profileImgUrl: string | null;

  @Column({
    name: 'role',
    type: 'enum',
    enum: UserRole,
    default: UserRole.MEMBER,
  })
  role: UserRole;

  @Column({
    name: 'plan',
    type: 'enum',
    enum: UserPlan,
    default: UserPlan.FREE,
  })
  plan: UserPlan;

  @Column({ name: 'storage_used_bytes', type: 'bigint', default: 0 })
  storageUsedBytes: string;

  @Column({ name: 'storage_quota_bytes', type: 'bigint', nullable: true })
  storageQuotaBytes: string | null;

  @Column({ name: 'is_email_verified', type: 'boolean', default: false })
  isEmailVerified: boolean;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt: Date | null;

  @Column({
    name: 'withdrawal_reason',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  withdrawalReason: string | null;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted: boolean;
}
