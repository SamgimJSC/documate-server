import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { BiometricType } from '../../global/constants/biometricType.enum';
import { User } from './user.entity';

@Entity('user_security')
export class UserSecurity {
  @PrimaryGeneratedColumn('uuid', { name: 'security_id' })
  securityId: string;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId: string;

  // SHA-256
  @Column({ name: 'pin_hash', type: 'varchar', length: 255, nullable: true })
  pinHash: string | null;

  @Column({ name: 'biometric_enabled', type: 'boolean', default: false })
  biometricEnabled: boolean;

  @Column({
    name: 'biometric_type',
    type: 'enum',
    enum: BiometricType,
    nullable: true,
  })
  biometricType: BiometricType | null;

  @Column({ name: 'pin_failed_count', type: 'smallint', default: 0 })
  pinFailedCount: number;

  @Column({ name: 'pin_updated_at', type: 'timestamptz', nullable: true })
  pinUpdatedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
